/**
 * Native Salesforce REST API Client for Cloud Climb
 *
 * A zero-dependency Salesforce client using native fetch() and Node.js crypto.
 * Implements JWT Bearer authentication with automatic token refresh.
 *
 * Adapted from Match Moments - same Salesforce org.
 */

import type {
  SalesforceQueryResponse,
  SalesforceIdentity,
  JWTTokenResponse,
  SalesforceError,
  SalesforceRecord,
} from './types';

interface SalesforceClientConfig {
  clientId: string;
  username: string;
  privateKey: string;
  instanceUrl: string;
  loginUrl?: string;
  apiVersion?: string;
}

export class SalesforceClient {
  private static instance: SalesforceClient | null = null;

  private accessToken: string | null = null;
  private instanceUrl: string;
  private isRefreshing: boolean = false;
  private lastRefresh: number = 0;
  private readonly TOKEN_LIFETIME = 7200000; // 2 hours
  private readonly REFRESH_BUFFER = 300000; // 5 minutes before expiry

  private readonly config: Required<SalesforceClientConfig>;

  private constructor(config?: Partial<SalesforceClientConfig>) {
    this.config = {
      clientId: config?.clientId || process.env.SALESFORCE_JWT_CLIENT_ID || '',
      username: config?.username || process.env.SALESFORCE_JWT_USERNAME || '',
      privateKey: config?.privateKey || process.env.SALESFORCE_JWT_PRIVATE_KEY || '',
      instanceUrl: config?.instanceUrl || process.env.SALESFORCE_INSTANCE_URL || '',
      loginUrl: config?.loginUrl || this.determineLoginUrl(process.env.SALESFORCE_INSTANCE_URL || ''),
      apiVersion: config?.apiVersion || '60.0',
    };

    this.instanceUrl = this.config.instanceUrl;
    this.validateConfig();
  }

  public static getInstance(config?: Partial<SalesforceClientConfig>): SalesforceClient {
    if (!SalesforceClient.instance) {
      SalesforceClient.instance = new SalesforceClient(config);
    }
    return SalesforceClient.instance;
  }

  public static resetInstance(): void {
    SalesforceClient.instance = null;
  }

  // Authentication

  public async authenticate(): Promise<void> {
    if (this.isTokenValid()) {
      console.log('[SF Client] Using cached access token');
      return;
    }

    if (this.isRefreshing) {
      console.log('[SF Client] Waiting for token refresh...');
      await this.waitForRefresh();
      return;
    }

    await this.refreshToken();
  }

  private async refreshToken(): Promise<void> {
    this.isRefreshing = true;

    try {
      console.log(`[SF Client] Authenticating with JWT Bearer Flow to ${this.config.loginUrl}...`);

      const jwt = await this.generateJWT();
      const tokenResponse = await this.exchangeJWTForToken(jwt);

      this.accessToken = tokenResponse.access_token;
      this.instanceUrl = tokenResponse.instance_url;
      this.lastRefresh = Date.now();

      console.log('[SF Client] Authentication successful');
    } catch (error: any) {
      console.error('[SF Client] Authentication failed:', error.message);

      if (error.message?.includes('invalid_grant')) {
        throw new Error(
          'JWT Bearer authentication failed. Check:\n' +
          '1. Certificate uploaded to Connected App\n' +
          '2. User pre-authorized in Connected App\n' +
          '3. Private key matches certificate'
        );
      }

      throw new Error(`Salesforce JWT authentication failed: ${error.message}`);
    } finally {
      this.isRefreshing = false;
    }
  }

  private async generateJWT(): Promise<string> {
    const crypto = await import('crypto');

    const header = { alg: 'RS256', typ: 'JWT' };
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iss: this.config.clientId,
      sub: this.config.username,
      aud: this.config.loginUrl,
      exp: now + 300
    };

    const encodeBase64Url = (obj: any): string => {
      return Buffer.from(JSON.stringify(obj))
        .toString('base64')
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');
    };

    const encodedHeader = encodeBase64Url(header);
    const encodedPayload = encodeBase64Url(payload);
    const signatureInput = `${encodedHeader}.${encodedPayload}`;

    const privateKey = this.formatPrivateKey(this.config.privateKey);
    const sign = crypto.createSign('RSA-SHA256');
    sign.update(signatureInput);
    const signature = sign.sign(privateKey, 'base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');

    return `${signatureInput}.${signature}`;
  }

  private async exchangeJWTForToken(jwt: string): Promise<JWTTokenResponse> {
    const tokenEndpoint = `${this.config.loginUrl}/services/oauth2/token`;
    const params = new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt
    });

    const response = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error_description || error.error || 'JWT token exchange failed');
    }

    return await response.json();
  }

  private isTokenValid(): boolean {
    if (!this.accessToken) return false;
    const tokenAge = Date.now() - this.lastRefresh;
    return tokenAge < (this.TOKEN_LIFETIME - this.REFRESH_BUFFER);
  }

  private async waitForRefresh(): Promise<void> {
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (!this.isRefreshing) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
      setTimeout(() => { clearInterval(checkInterval); resolve(); }, 30000);
    });
  }

  // Query Methods

  public async query<T extends SalesforceRecord>(soql: string): Promise<T[]> {
    await this.authenticate();

    const endpoint = `${this.instanceUrl}/services/data/v${this.config.apiVersion}/query`;
    const url = `${endpoint}?q=${encodeURIComponent(soql)}`;

    const response = await this.makeRequest<SalesforceQueryResponse<T>>(url, { method: 'GET' });
    return response.records;
  }

  /**
   * Execute a SOQL query and return the full response including totalSize.
   * Useful for COUNT() queries or when you need metadata.
   */
  public async queryRaw<T extends SalesforceRecord>(soql: string): Promise<SalesforceQueryResponse<T>> {
    await this.authenticate();

    const endpoint = `${this.instanceUrl}/services/data/v${this.config.apiVersion}/query`;
    const url = `${endpoint}?q=${encodeURIComponent(soql)}`;

    return await this.makeRequest<SalesforceQueryResponse<T>>(url, { method: 'GET' });
  }

  public async queryAll<T extends SalesforceRecord>(soql: string): Promise<T[]> {
    await this.authenticate();

    let allRecords: T[] = [];
    let nextRecordsUrl: string | undefined;

    const endpoint = `${this.instanceUrl}/services/data/v${this.config.apiVersion}/query`;
    const url = `${endpoint}?q=${encodeURIComponent(soql)}`;

    let response = await this.makeRequest<SalesforceQueryResponse<T>>(url, { method: 'GET' });
    allRecords = allRecords.concat(response.records);
    nextRecordsUrl = response.nextRecordsUrl;

    while (nextRecordsUrl) {
      const nextUrl = `${this.instanceUrl}${nextRecordsUrl}`;
      response = await this.makeRequest<SalesforceQueryResponse<T>>(nextUrl, { method: 'GET' });
      allRecords = allRecords.concat(response.records);
      nextRecordsUrl = response.nextRecordsUrl;
    }

    return allRecords;
  }

  // SOSL Search
  public async search<T extends SalesforceRecord>(sosl: string): Promise<T[]> {
    await this.authenticate();

    const endpoint = `${this.instanceUrl}/services/data/v${this.config.apiVersion}/search`;
    const url = `${endpoint}?q=${encodeURIComponent(sosl)}`;

    const response = await this.makeRequest<{ searchRecords: T[] }>(url, { method: 'GET' });
    return response.searchRecords;
  }

  // CRUD Operations

  public async create(sobject: string, data: Record<string, any>): Promise<string> {
    await this.authenticate();

    const endpoint = `${this.instanceUrl}/services/data/v${this.config.apiVersion}/sobjects/${sobject}`;
    const response = await this.makeRequest<{ id: string; success: boolean }>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data)
    });

    return response.id;
  }

  public async update(sobject: string, id: string, data: Record<string, any>): Promise<void> {
    await this.authenticate();

    const endpoint = `${this.instanceUrl}/services/data/v${this.config.apiVersion}/sobjects/${sobject}/${id}`;
    await this.makeRequest<void>(endpoint, { method: 'PATCH', body: JSON.stringify(data) });
  }

  public async delete(sobject: string, id: string): Promise<void> {
    await this.authenticate();

    const endpoint = `${this.instanceUrl}/services/data/v${this.config.apiVersion}/sobjects/${sobject}/${id}`;
    await this.makeRequest<void>(endpoint, { method: 'DELETE' });
  }

  public async retrieve<T extends SalesforceRecord>(
    sobject: string,
    id: string,
    fields: string[]
  ): Promise<T> {
    await this.authenticate();

    const endpoint = `${this.instanceUrl}/services/data/v${this.config.apiVersion}/sobjects/${sobject}/${id}`;
    const url = `${endpoint}?fields=${fields.join(',')}`;

    return await this.makeRequest<T>(url, { method: 'GET' });
  }

  // Utility Methods

  public async getIdentity(): Promise<SalesforceIdentity> {
    await this.authenticate();
    const endpoint = `${this.instanceUrl}/services/oauth2/userinfo`;
    return await this.makeRequest<SalesforceIdentity>(endpoint, { method: 'GET' });
  }

  public getStatus() {
    return {
      connected: this.accessToken !== null && this.isTokenValid(),
      lastRefresh: this.lastRefresh,
      tokenAge: this.lastRefresh > 0 ? Date.now() - this.lastRefresh : 0,
      instanceUrl: this.instanceUrl,
    };
  }

  public async forceReconnect(): Promise<void> {
    console.log('[SF Client] Force reconnecting...');
    this.accessToken = null;
    this.lastRefresh = 0;
    await this.authenticate();
  }

  // Private Helpers

  private async makeRequest<T>(url: string, options: RequestInit): Promise<T> {
    if (!this.accessToken) {
      throw new Error('Not authenticated. Call authenticate() first.');
    }

    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      await this.handleErrorResponse(response);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return await response.json();
  }

  private async handleErrorResponse(response: Response): Promise<never> {
    let errorMessage = `Salesforce API error: ${response.status} ${response.statusText}`;

    try {
      const errorData = await response.json();
      if (Array.isArray(errorData) && errorData.length > 0) {
        const errors = errorData as SalesforceError[];
        errorMessage = errors.map(e => `${e.errorCode}: ${e.message}`).join(', ');
      } else if (errorData.error) {
        errorMessage = errorData.error_description || errorData.error;
      }
    } catch {
      // Use default message
    }

    throw new Error(errorMessage);
  }

  private validateConfig(): void {
    const required = ['clientId', 'username', 'privateKey', 'instanceUrl'] as const;
    const missing = required.filter(key => !this.config[key]);

    if (missing.length > 0) {
      throw new Error(
        `Missing Salesforce configuration: ${missing.join(', ')}\n` +
        'Required environment variables:\n' +
        '- SALESFORCE_JWT_CLIENT_ID\n' +
        '- SALESFORCE_JWT_USERNAME\n' +
        '- SALESFORCE_JWT_PRIVATE_KEY\n' +
        '- SALESFORCE_INSTANCE_URL'
      );
    }
  }

  private determineLoginUrl(instanceUrl: string): string {
    const lowerUrl = instanceUrl.toLowerCase();
    if (lowerUrl.includes('.sandbox.my.salesforce.com')) {
      return 'https://test.salesforce.com';
    }
    return 'https://login.salesforce.com';
  }

  private formatPrivateKey(key: string): string {
    let formatted = key.replace(/\\n/g, '\n').trim();
    if (!formatted.startsWith('-----BEGIN')) {
      formatted = '-----BEGIN PRIVATE KEY-----\n' + formatted;
    }
    if (!formatted.endsWith('-----')) {
      formatted = formatted + '\n-----END PRIVATE KEY-----';
    }
    return formatted;
  }
}

export function getSalesforceClient(): SalesforceClient {
  return SalesforceClient.getInstance();
}

export async function testSalesforceConnection(): Promise<boolean> {
  try {
    const client = getSalesforceClient();
    await client.authenticate();
    await client.getIdentity();
    return true;
  } catch (error: any) {
    console.error('[SF Client] Connection test failed:', error.message);
    return false;
  }
}

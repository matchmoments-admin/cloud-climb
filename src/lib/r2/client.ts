import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

/**
 * Cloudflare R2 Client
 * S3-compatible storage for blog images
 */

// Validate required environment variables
function validateConfig() {
  const required = [
    'CLOUDFLARE_ACCOUNT_ID',
    'CLOUDFLARE_R2_ACCESS_KEY_ID',
    'CLOUDFLARE_R2_SECRET_ACCESS_KEY',
    'CLOUDFLARE_R2_BUCKET_NAME',
  ];

  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing R2 environment variables: ${missing.join(', ')}`);
  }
}

// Lazy initialization of S3 client
let _r2Client: S3Client | null = null;

function getR2Client(): S3Client {
  if (!_r2Client) {
    validateConfig();

    const endpoint = `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`;

    _r2Client = new S3Client({
      region: 'auto',
      endpoint,
      credentials: {
        accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
      },
    });
  }

  return _r2Client;
}

/**
 * Get the public URL for a file in R2
 */
export function getPublicUrl(key: string): string {
  const publicUrl = process.env.CLOUDFLARE_R2_PUBLIC_URL;
  if (publicUrl) {
    return `${publicUrl}/${key}`;
  }
  // Fallback to default R2 public URL pattern
  return `https://${process.env.CLOUDFLARE_R2_BUCKET_NAME}.${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com/${key}`;
}

/**
 * Upload a file to R2
 * @param file - File buffer to upload
 * @param key - Storage key (path) for the file
 * @param contentType - MIME type of the file
 * @returns Public URL of the uploaded file
 */
export async function uploadToR2(
  file: Buffer,
  key: string,
  contentType: string
): Promise<string> {
  const client = getR2Client();
  const bucket = process.env.CLOUDFLARE_R2_BUCKET_NAME!;

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: file,
      ContentType: contentType,
      // Cache for 1 year (immutable content)
      CacheControl: 'public, max-age=31536000, immutable',
    })
  );

  return getPublicUrl(key);
}

/**
 * Delete a file from R2
 * @param key - Storage key of the file to delete
 */
export async function deleteFromR2(key: string): Promise<void> {
  const client = getR2Client();
  const bucket = process.env.CLOUDFLARE_R2_BUCKET_NAME!;

  await client.send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    })
  );
}

/**
 * Check if a file exists in R2
 * @param key - Storage key to check
 * @returns true if file exists, false otherwise
 */
export async function fileExistsInR2(key: string): Promise<boolean> {
  const client = getR2Client();
  const bucket = process.env.CLOUDFLARE_R2_BUCKET_NAME!;

  try {
    await client.send(
      new HeadObjectCommand({
        Bucket: bucket,
        Key: key,
      })
    );
    return true;
  } catch (error: any) {
    if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
      return false;
    }
    throw error;
  }
}

/**
 * Generate a presigned URL for client-side uploads
 * @param key - Storage key for the file
 * @param contentType - Expected MIME type
 * @param expiresIn - URL expiration time in seconds (default: 1 hour)
 * @returns Presigned upload URL
 */
export async function getPresignedUploadUrl(
  key: string,
  contentType: string,
  expiresIn: number = 3600
): Promise<string> {
  const client = getR2Client();
  const bucket = process.env.CLOUDFLARE_R2_BUCKET_NAME!;

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
  });

  return getSignedUrl(client, command, { expiresIn });
}

/**
 * Generate a unique key for article images
 * @param originalFilename - Original filename
 * @param prefix - Optional prefix (default: 'articles')
 * @returns Unique storage key with date-based path
 */
export function generateImageKey(
  originalFilename: string,
  prefix: string = 'articles'
): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const timestamp = Date.now();

  // Sanitize filename: lowercase, remove special chars, keep extension
  const ext = originalFilename.split('.').pop()?.toLowerCase() || 'jpg';
  const baseName = originalFilename
    .split('.')[0]
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 50);

  return `${prefix}/${year}/${month}/${timestamp}-${baseName}.${ext}`;
}

/**
 * Extract the R2 key from a public URL
 * @param url - Public URL of the file
 * @returns Storage key or null if not an R2 URL
 */
export function extractKeyFromUrl(url: string): string | null {
  const publicUrl = process.env.CLOUDFLARE_R2_PUBLIC_URL;
  if (publicUrl && url.startsWith(publicUrl)) {
    return url.replace(`${publicUrl}/`, '');
  }
  return null;
}

/**
 * Supported image MIME types
 */
export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
];

/**
 * Maximum file size (5MB)
 */
export const MAX_FILE_SIZE = 5 * 1024 * 1024;

/**
 * Validate an image file for upload
 * @param file - File to validate
 * @param contentType - MIME type
 * @returns Validation result with error message if invalid
 */
export function validateImageFile(
  fileSize: number,
  contentType: string
): { valid: boolean; error?: string } {
  if (!ALLOWED_IMAGE_TYPES.includes(contentType)) {
    return {
      valid: false,
      error: `Invalid file type. Allowed: ${ALLOWED_IMAGE_TYPES.join(', ')}`,
    };
  }

  if (fileSize > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File too large. Maximum size: ${MAX_FILE_SIZE / 1024 / 1024}MB`,
    };
  }

  return { valid: true };
}

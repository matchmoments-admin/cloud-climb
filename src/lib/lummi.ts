/**
 * Lummi API Client
 *
 * Search and retrieve free AI-generated stock photos from Lummi.ai
 * Attribution is required for all images.
 *
 * @see https://www.lummi.ai/developers/api-reference
 */

// ============================================================================
// TYPES
// ============================================================================

export interface LummiAuthor {
  name: string;
  username: string;
  attributionUrl: string;
  avatarUrl?: string;
}

export interface LummiImage {
  id: string;
  url: string;
  thumbnailUrl: string;
  attributionUrl: string;
  author: LummiAuthor;
  width: number;
  height: number;
  aspectRatio: number;
  title?: string;
  description?: string;
  tags?: string[];
  categories?: string[];
}

export interface LummiSearchResponse {
  images: LummiImage[];
  total: number;
  page: number;
  perPage: number;
  hasMore: boolean;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const LUMMI_API_BASE = 'https://api.lummi.ai/v1';

function getApiKey(): string {
  const apiKey = process.env.LUMMI_API_KEY;
  if (!apiKey) {
    throw new Error('LUMMI_API_KEY environment variable is not set');
  }
  return apiKey;
}

// ============================================================================
// API CLIENT
// ============================================================================

/**
 * Search for free stock photos on Lummi
 *
 * @param query - Search query
 * @param options - Search options
 * @returns Array of images with attribution info
 */
export async function searchLummiPhotos(
  query: string,
  options: {
    limit?: number;
    page?: number;
    aspectRatio?: 'landscape' | 'portrait' | 'square';
  } = {}
): Promise<LummiSearchResponse> {
  const { limit = 12, page = 1, aspectRatio } = options;

  const params = new URLSearchParams({
    query: query.trim(),
    free: 'true', // Only fetch free images
    per_page: String(limit),
    page: String(page),
  });

  if (aspectRatio) {
    params.set('aspect_ratio', aspectRatio);
  }

  const url = `${LUMMI_API_BASE}/images/search?${params.toString()}`;

  console.log('[Lummi] Searching:', query);
  console.log('[Lummi] URL:', url);

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[Lummi] API error:', response.status, errorText);

    if (response.status === 401) {
      throw new Error('Invalid Lummi API key');
    }
    if (response.status === 429) {
      throw new Error('Lummi rate limit exceeded. Please wait and try again.');
    }
    throw new Error(`Lummi API error: ${response.status}`);
  }

  const data = await response.json();

  // Transform response to our standard format
  const images: LummiImage[] = (data.data || data.images || []).map(
    (img: Record<string, unknown>) => {
      const urls = img.urls as Record<string, string> | undefined;
      const author = img.author as Record<string, unknown> | undefined;

      return {
        id: img.id as string,
        url: (img.url || urls?.regular || urls?.full) as string,
        thumbnailUrl: (img.thumbnail_url || urls?.thumb || urls?.small || img.url) as string,
        attributionUrl: (img.attribution_url || img.attributionUrl) as string,
        author: {
          name: (author?.name as string) || 'Unknown',
          username: (author?.username as string) || '',
          attributionUrl: (author?.attribution_url || author?.attributionUrl) as string || '',
          avatarUrl: author?.avatar_url as string,
        },
        width: (img.width as number) || 0,
        height: (img.height as number) || 0,
        aspectRatio: (img.aspect_ratio as number) || ((img.width as number) / (img.height as number)) || 1,
        title: img.title as string,
        description: img.description as string,
        tags: img.tags as string[],
        categories: img.categories as string[],
      };
    }
  );

  console.log('[Lummi] Found', images.length, 'images');

  return {
    images,
    total: data.total || data.total_count || images.length,
    page: data.page || page,
    perPage: data.per_page || limit,
    hasMore: data.has_more ?? images.length === limit,
  };
}

/**
 * Get random free stock photos from Lummi
 *
 * @param limit - Number of images to fetch
 * @returns Array of random images
 */
export async function getRandomLummiPhotos(
  limit: number = 12
): Promise<LummiImage[]> {
  const url = `${LUMMI_API_BASE}/images/random?free=true&limit=${limit}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Lummi API error: ${response.status}`);
  }

  const data = await response.json();

  return (data.data || data.images || []).map(
    (img: Record<string, unknown>) => {
      const urls = img.urls as Record<string, string> | undefined;
      const author = img.author as Record<string, unknown> | undefined;

      return {
        id: img.id as string,
        url: (img.url || urls?.regular) as string,
        thumbnailUrl: (img.thumbnail_url || urls?.thumb || img.url) as string,
        attributionUrl: (img.attribution_url || img.attributionUrl) as string,
        author: {
          name: (author?.name as string) || 'Unknown',
          username: (author?.username as string) || '',
          attributionUrl: (author?.attribution_url || author?.attributionUrl) as string || '',
        },
        width: (img.width as number) || 0,
        height: (img.height as number) || 0,
        aspectRatio: (img.aspect_ratio as number) || 1,
      };
    }
  );
}

/**
 * Format attribution text for a Lummi image
 * This should be displayed near the image per Lummi's requirements
 *
 * @param image - The Lummi image object
 * @returns Formatted attribution string (HTML)
 */
export function formatLummiAttribution(image: LummiImage): string {
  const authorLink = image.author.attributionUrl
    ? `<a href="${image.author.attributionUrl}" target="_blank" rel="noopener noreferrer">${image.author.name}</a>`
    : image.author.name;

  const imageLink = image.attributionUrl
    ? `<a href="${image.attributionUrl}" target="_blank" rel="noopener noreferrer">Lummi</a>`
    : 'Lummi';

  return `Photo by ${authorLink} on ${imageLink}`;
}

/**
 * Format plain text attribution for a Lummi image
 * Useful for alt text or simple captions
 *
 * @param image - The Lummi image object
 * @returns Plain text attribution
 */
export function formatLummiAttributionText(image: LummiImage): string {
  return `Photo by ${image.author.name} on Lummi`;
}

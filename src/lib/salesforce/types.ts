/**
 * Salesforce REST API Types for Cloud Climb
 *
 * Type definitions focused on Article__c and related objects.
 * Uses the same Salesforce org as Match Moments.
 */

// Salesforce REST API Response Types

export interface SalesforceQueryResponse<T> {
  totalSize: number;
  done: boolean;
  records: T[];
  nextRecordsUrl?: string;
}

export interface SalesforceIdentity {
  id: string;
  user_id: string;
  organization_id: string;
  username: string;
  display_name: string;
  email: string;
  first_name: string;
  last_name: string;
  timezone: string;
  photos: {
    picture: string;
    thumbnail: string;
  };
  active: boolean;
}

export interface SalesforceError {
  message: string;
  errorCode: string;
  fields?: string[];
}

export interface JWTTokenResponse {
  access_token: string;
  scope: string;
  instance_url: string;
  id: string;
  token_type: string;
}

// Base Salesforce Record

export interface SalesforceRecord {
  Id: string;
  Name?: string;
  CreatedDate?: string;
  LastModifiedDate?: string;
}

// Standard Objects

/**
 * Contact - Authors (using Player record type or custom Author record type)
 */
export interface Contact extends SalesforceRecord {
  RecordTypeId?: string;
  FirstName?: string;
  LastName?: string;
  Email?: string;
  Title?: string;
  Description?: string;
  Profile_Image_URL__c?: string;
  // Author-specific fields (may need to be added to SF)
  Author_Bio__c?: string;
  Author_Slug__c?: string;
  Social_Twitter__c?: string;
  Social_LinkedIn__c?: string;
  Social_GitHub__c?: string;
}

/**
 * Lead - Newsletter subscribers
 */
export interface Lead extends SalesforceRecord {
  FirstName?: string;
  LastName?: string;
  Email?: string;
  Company?: string;
  LeadSource?: string;
  Status?: string;
  Description?: string;
}

// Custom Objects - Content

/**
 * Article__c - Blog posts and articles
 * Uses existing Article__c from Match Moments org
 */
export interface Article extends SalesforceRecord {
  // Core content fields
  Heading__c?: string;
  Slug__c?: string;
  Body__c?: string;
  Excerpt__c?: string;
  Header_Image_URL__c?: string;

  // Metadata
  Category__c?: string;
  Tags__c?: string;
  Is_Published__c?: boolean;
  Is_Featured__c?: boolean;
  Article_Date__c?: string;
  Reading_Time__c?: number;
  View_Count__c?: number;

  // Author relationship
  Author__c?: string;
  Author__r?: Contact;

  // SEO fields
  Meta_Title__c?: string;
  Meta_Description__c?: string;

  // Source attribution
  Article_URL__c?: string;
  Source__c?: string;

  // Related content (from Match Moments)
  Related_Team__c?: string;
  Related_Match__c?: string;
  Related_Player__c?: string;
  Sport_Type__c?: string;
}

/**
 * Category__c - Article categories (if exists, otherwise use picklist)
 */
export interface Category extends SalesforceRecord {
  Slug__c?: string;
  Description__c?: string;
  Color__c?: string;
  Sort_Order__c?: number;
}

// Query Filter Types

export interface ArticleFilters {
  category?: string;
  author?: string;
  tag?: string;
  isPublished?: boolean;
  isFeatured?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface AuthorFilters {
  slug?: string;
  limit?: number;
}

export interface CategoryFilters {
  limit?: number;
}

// Cache Configuration

export interface CacheConfig {
  key: string;
  ttl: number;
}

export interface QueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
}

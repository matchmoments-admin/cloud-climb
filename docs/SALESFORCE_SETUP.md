# Cloud Climb - Salesforce Setup Guide

This document outlines all Salesforce fields and configurations needed to support the Cloud Climb blog features.

---

## Table of Contents

1. [Article Object (Article__c)](#article-object-article__c)
2. [Author (Contact)](#author-contact)
3. [Supporting Objects](#supporting-objects)
4. [Image Storage Solutions](#image-storage-solutions)
5. [Rich Text Content](#rich-text-content)
6. [Permission Sets](#permission-sets)
7. [Sample Data](#sample-data)

---

## Article Object (Article__c)

### Required Fields

| Field API Name | Label | Type | Description | Used In |
|---------------|-------|------|-------------|---------|
| `Heading__c` | Title | Text(255) | Article title | Card title, page header, SEO |
| `Slug__c` | URL Slug | Text(255), Unique | URL-friendly identifier (e.g., `building-scalable-systems`) | Routing, URLs |
| `Body__c` or `Content__c` | Body Content | Long Text Area / Rich Text | Full article HTML content | Article detail page |
| `Excerpt__c` | Excerpt | Long Text Area(500) | Short summary for cards | Article cards, meta description |
| `Header_Image_URL__c` | Featured Image URL | URL(255) | External image URL | Featured image, cards, OG image |
| `Category__c` | Category | Picklist or Text | Article category | Navigation, filtering |
| `Article_Date__c` or `Publish_Date__c` | Published Date | Date/DateTime | When article was published | Sorting, display |
| `Is_Published__c` | Is Published | Checkbox | Publication status | Visibility filtering |

### Recommended Fields

| Field API Name | Label | Type | Description | Used In |
|---------------|-------|------|-------------|---------|
| `Subtitle__c` | Subtitle | Text(500) | Article subtitle/deck | Article header |
| `Tags__c` | Tags | Text(255) | Comma-separated tags | Related articles, filtering |
| `Reading_Time__c` or `Reading_Time_Minutes__c` | Read Time | Number | Estimated read time in minutes | Article cards, header |
| `Is_Featured__c` | Is Featured | Checkbox | Featured article flag | Homepage highlighting |
| `Is_Premium__c` | Is Premium | Checkbox | Premium/gated content flag | Content gating |
| `View_Count__c` | View Count | Number | Page view counter | Analytics, popularity |
| `Meta_Title__c` | Meta Title | Text(255) | Custom SEO title | SEO |
| `Meta_Description__c` | Meta Description | Long Text Area(320) | Custom SEO description | SEO |
| `Author__c` | Author | Lookup(Contact) | Link to author record | Author info display |
| `Author_Name__c` | Author Name | Text(255) | Fallback author name | When no Contact linked |
| `Certification__c` | Certification | Lookup(Certification__c) | Related certification | Certification pages |
| `Topic__c` | Topic | Lookup(Topic__c) | Related topic | Topic pages |
| `Status__c` | Status | Picklist | Draft/Review/Published | Workflow |
| `External_ID__c` | External ID | Text(255), External ID | For integrations | Data imports |

### Field Configuration Notes

```
Slug__c:
  - Must be unique
  - Indexed for fast lookups
  - Format: lowercase, hyphens, no special chars
  - Example: "building-scalable-systems-event-driven"

Body__c / Content__c:
  - Use Rich Text Area if you need WYSIWYG in Salesforce
  - Use Long Text Area if storing raw HTML
  - Maximum: 131,072 characters (Rich Text) or 32,768 (Long Text)
  - For very long articles, consider using ContentDocument attachment

Category__c options (suggested):
  - Engineering
  - Tech
  - Tutorials
  - Product
  - Certification Tips
  - Study Guides
  - News
```

---

## Author (Contact)

The blog uses Salesforce Contact records for authors. Required fields:

| Field API Name | Label | Type | Description |
|---------------|-------|------|-------------|
| `FirstName` | First Name | Text | Author first name |
| `LastName` | Last Name | Text | Author last name |
| `Email` | Email | Email | Author email (optional display) |
| `Title` | Title/Role | Text | "Principal Engineer", "Tech Lead", etc. |
| `Description` | Bio | Long Text Area | Author biography |
| `PhotoUrl` | Photo URL | URL | Author avatar image URL |

### Custom Fields for Authors (Optional)

| Field API Name | Label | Type | Description |
|---------------|-------|------|-------------|
| `Author_Slug__c` | Author Slug | Text(100) | URL slug for author pages |
| `Twitter_Handle__c` | Twitter | Text(50) | Twitter/X username |
| `LinkedIn_URL__c` | LinkedIn | URL | LinkedIn profile URL |
| `GitHub_Username__c` | GitHub | Text(50) | GitHub username |
| `Is_Blog_Author__c` | Is Blog Author | Checkbox | Filter for blog authors only |

---

## Supporting Objects

### Certification__c (Optional)

For certification-focused content:

| Field API Name | Type | Description |
|---------------|------|-------------|
| `Name` | Text | Certification name (e.g., "AWS Solutions Architect") |
| `Certification_Code__c` | Text | Code (e.g., "SAA-C03") |
| `Description__c` | Long Text | Certification description |
| `Provider__c` | Picklist | AWS, Azure, GCP, Salesforce, etc. |
| `Is_Active__c` | Checkbox | Active certification |
| `Icon_URL__c` | URL | Certification badge/icon |

### Topic__c (Optional)

For topic-based organization:

| Field API Name | Type | Description |
|---------------|------|-------------|
| `Name` | Text | Topic name |
| `Topic_Code__c` | Text | Short code |
| `Description__c` | Long Text | Topic description |
| `Parent_Topic__c` | Lookup(Topic__c) | Hierarchical topics |

---

## Image Storage Solutions

### Recommendation: Cloudflare R2 (Cheapest)

**Why R2?**
- **No egress fees** (major cost savings vs S3/GCS)
- Storage: $0.015/GB/month (first 10GB free)
- No charge for requests from Cloudflare CDN
- S3-compatible API
- Built-in CDN via Cloudflare

**Monthly Cost Estimate (Blog with 1000 visitors/day):**
- 5GB images: $0.075/month
- Bandwidth: $0 (no egress fees)
- **Total: ~$0.08/month**

### Setup with Cloudflare R2

1. **Create R2 Bucket**
```bash
# Via Cloudflare Dashboard or Wrangler CLI
wrangler r2 bucket create cloud-climb-images
```

2. **Enable Public Access**
   - Dashboard → R2 → Your bucket → Settings
   - Enable "Public Access" with custom domain

3. **Custom Domain (Recommended)**
   - Add `images.cloudclimb.io` as custom domain
   - Automatic SSL and CDN

4. **Upload Images**
```bash
# Using AWS CLI (R2 is S3-compatible)
aws s3 cp ./article-image.jpg s3://cloud-climb-images/articles/2026/01/article-image.jpg \
  --endpoint-url https://<ACCOUNT_ID>.r2.cloudflarestorage.com
```

5. **Reference in Salesforce**
```
Header_Image_URL__c = "https://images.cloudclimb.io/articles/2026/01/my-article-hero.jpg"
```

### Alternative Options (Comparison)

| Service | Storage | Egress | Free Tier | Best For |
|---------|---------|--------|-----------|----------|
| **Cloudflare R2** | $0.015/GB | $0 | 10GB | Blogs, high traffic |
| Backblaze B2 | $0.005/GB | $0.01/GB | 10GB | Archives, low traffic |
| Bunny Storage | $0.01/GB | ~$0.01/GB | None | Global CDN needs |
| Cloudinary | Variable | Included | 25GB | Image transforms |
| AWS S3 | $0.023/GB | $0.09/GB | 5GB/12mo | Enterprise |
| Vercel Blob | $0.15/GB | Included | 1GB | Vercel deployments |

### Image URL Structure

Recommended folder structure:
```
/articles/
  /2026/
    /01/
      event-driven-hero.jpg
      event-driven-diagram-1.jpg
  /02/
    ...
/authors/
  sarah-chen.jpg
  marcus-johnson.jpg
/categories/
  engineering.jpg
  tutorials.jpg
```

### Next.js Image Configuration

Add your image domain to `next.config.ts`:

```typescript
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.cloudclimb.io', // Your R2 custom domain
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com', // For development/fallback
      },
    ],
  },
};
```

---

## Rich Text Content

### HTML Elements Supported in Body

The blog prose styling supports these HTML elements:

```html
<!-- Headings -->
<h2>Section Title</h2>
<h3>Subsection</h3>
<h4>Minor Heading</h4>

<!-- Paragraphs -->
<p>Regular paragraph text with <strong>bold</strong> and <em>italic</em>.</p>

<!-- Links -->
<a href="https://example.com">Link text</a>

<!-- Lists -->
<ul>
  <li>Unordered list item</li>
</ul>
<ol>
  <li>Ordered list item</li>
</ol>

<!-- Code -->
<code>inline code</code>
<pre><code>
// Code block
function example() {
  return 'Hello World';
}
</code></pre>

<!-- Quotes -->
<blockquote>
  "Important quote or callout text."
</blockquote>

<!-- Images (inline in body) -->
<figure>
  <img src="https://images.cloudclimb.io/articles/diagram.png" alt="Description" />
  <figcaption>Image caption text</figcaption>
</figure>

<!-- Tables -->
<table>
  <thead>
    <tr><th>Header 1</th><th>Header 2</th></tr>
  </thead>
  <tbody>
    <tr><td>Cell 1</td><td>Cell 2</td></tr>
  </tbody>
</table>

<!-- Horizontal Rule -->
<hr />
```

### Storing HTML in Salesforce

**Option 1: Rich Text Area Field**
- Pros: WYSIWYG editor in Salesforce
- Cons: Limited to 131,072 chars, may strip some HTML

**Option 2: Long Text Area + External Editor**
- Pros: Full HTML control, larger content
- Cons: No preview in Salesforce

**Option 3: Content Document Attachment**
- Pros: Unlimited size, version control
- Cons: More complex to query

### Recommended Approach

Use `Content__c` as a Rich Text Area for most articles. For very long technical articles with lots of code, use an external markdown/HTML editor and store in `Body__c` as Long Text Area.

---

## Permission Sets

Ensure these permission sets are assigned:

### Article_Admin
- Full CRUD on Article__c
- Full CRUD on Certification__c
- Full CRUD on Topic__c

### Article_Reader (for API user)
- Read on Article__c (all fields)
- Read on Contact (author fields)
- Read on Certification__c
- Read on Topic__c

### Required Field-Level Security

```
Article__c:
  - All fields listed above: Read access minimum
  - Is_Published__c: Used in WHERE clauses
  - Slug__c: Used for lookups

Contact:
  - FirstName, LastName, Title, Description, PhotoUrl, Email
```

---

## Sample Data

### Sample Article Record

```json
{
  "Heading__c": "Building Scalable Systems with Event-Driven Architecture",
  "Slug__c": "building-scalable-systems-event-driven",
  "Subtitle__c": "How modern distributed systems leverage events for loose coupling and high throughput",
  "Excerpt__c": "Learn how event-driven architecture can help you build systems that scale effortlessly while remaining maintainable and resilient.",
  "Body__c": "<p>Event-driven architecture (EDA) is a software design pattern...</p><h2>What is EDA?</h2><p>At its core...</p>",
  "Header_Image_URL__c": "https://images.cloudclimb.io/articles/2026/01/event-driven-hero.jpg",
  "Category__c": "Engineering",
  "Tags__c": "architecture,scalability,events,distributed-systems",
  "Article_Date__c": "2026-01-15",
  "Is_Published__c": true,
  "Is_Featured__c": true,
  "Reading_Time_Minutes__c": 8,
  "Meta_Title__c": "Building Scalable Systems with Event-Driven Architecture | Cloud Climb",
  "Author__c": "003XXXXXXXXXXXX"
}
```

### Sample Author Contact

```json
{
  "FirstName": "Sarah",
  "LastName": "Chen",
  "Title": "Principal Engineer",
  "Description": "Principal Engineer at Cloud Climb with 10+ years of experience building distributed systems. Previously at AWS and Netflix.",
  "Email": "sarah.chen@cloudclimb.io",
  "PhotoUrl": "https://images.cloudclimb.io/authors/sarah-chen.jpg",
  "Author_Slug__c": "sarah-chen",
  "Twitter_Handle__c": "@sarahchen_dev",
  "Is_Blog_Author__c": true
}
```

---

## Checklist

Before going live, verify:

- [ ] Article__c object created with all required fields
- [ ] Slug__c field is unique and indexed
- [ ] Author lookup to Contact configured
- [ ] Permission sets assigned to API user
- [ ] Field-level security enabled for all fields
- [ ] R2 bucket created with public access
- [ ] Custom domain configured for images
- [ ] next.config.ts updated with image domains
- [ ] Sample article created and accessible via API
- [ ] Rich text content renders correctly

---

## Quick Reference: Salesforce Field Mapping

```typescript
// How Salesforce fields map to UI
{
  // Article Card
  title: Heading__c,
  slug: Slug__c,
  excerpt: Excerpt__c,
  featuredImage: Header_Image_URL__c,
  category: Category__c,
  publishedDate: Article_Date__c,
  readTime: Reading_Time_Minutes__c,
  authorName: Author__r.FirstName + Author__r.LastName || Author_Name__c,

  // Article Detail Page
  subtitle: Subtitle__c,
  body: Body__c || Content__c,
  tags: Tags__c.split(','),
  authorAvatar: Author__r.PhotoUrl,
  authorBio: Author__r.Description,
  authorRole: Author__r.Title,

  // SEO
  metaTitle: Meta_Title__c || Heading__c,
  metaDescription: Meta_Description__c || Excerpt__c,
  ogImage: Header_Image_URL__c,
}
```

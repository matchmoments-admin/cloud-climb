# Salesforce Requirements for Cloud Climb Education Platform

This document outlines the Salesforce configuration required for the education platform including:
- Blog posts and articles
- Tutorials with embedded questions
- JavaScript coding exercises

---

## Article__c Object Fields

### Required Fields for Admin CRUD Operations

| Field API Name | Type | Length | Description | Required |
|----------------|------|--------|-------------|----------|
| `Heading__c` | Text | 255 | Article title | Yes |
| `Body__c` | Rich Text Area | 131072 | Full HTML content with inline images | Yes |
| `Slug__c` | Text | 255 | URL-friendly identifier (unique, indexed) | Yes |
| `Header_Image_URL__c` | URL | 255 | Featured image URL (from Cloudflare R2) | No |
| `Category__c` | Picklist/Text | 100 | Article category | Yes |
| `Article_Date__c` | Date | - | Publication date | Yes |
| `Is_Published__c` | Checkbox | - | Controls visibility on public site | Yes |
| `Status__c` | Picklist | - | Workflow status | Yes |

### Optional Fields

| Field API Name | Type | Length | Description |
|----------------|------|--------|-------------|
| `Subtitle__c` | Text | 500 | Article subtitle/deck |
| `Excerpt__c` | Long Text Area | 500 | Summary for cards and SEO |
| `Tags__c` | Text | 255 | Comma-separated tags |
| `Is_Featured__c` | Checkbox | - | Featured article flag |
| `Reading_Time_Minutes__c` | Number | - | Estimated read time |
| `Author_Name__c` | Text | 255 | Fallback author name |
| `Author__c` | Lookup(Contact) | - | Link to author record |
| `Meta_Title__c` | Text | 255 | Custom SEO title |
| `Meta_Description__c` | Long Text Area | 320 | Custom SEO description |
| `View_Count__c` | Number | - | Page view counter |
| `Word_Count__c` | Number | - | Calculated word count |

### New Fields for Tutorials & Exercises

| Field API Name | Type | Length | Description |
|----------------|------|--------|-------------|
| `Article_Type__c` | Picklist | - | Content type (see picklist values below) |
| `Starter_Code__c` | Long Text Area | 32000 | Initial code for exercises |
| `Solution_Code__c` | Long Text Area | 32000 | Reference solution (hidden from users) |
| `Instructions__c` | Rich Text Area | 32000 | Detailed exercise instructions |

### Article_Type__c Picklist Values

| Value | Description |
|-------|-------------|
| `Blog_Post` | Standard blog article (default) |
| `Tutorial` | Educational content with embedded questions |
| `Exercise` | Interactive JavaScript coding challenge |

---

## Status__c Picklist Values

Configure the `Status__c` field with these values:

| Value | Description |
|-------|-------------|
| `Draft` | Work in progress, not visible |
| `Pending Review` | Ready for editorial review |
| `Published` | Live on the public site |
| `Archived` | Removed from public view |

---

## Field-Level Security

### API User Permission Set: `Article_Admin`

Grant **Read + Edit + Create + Delete** access to:
- All `Article__c` fields listed above
- `Contact` fields: `FirstName`, `LastName`, `Email`, `Title`, `Description`, `PhotoUrl`

---

## Validation Rules

### 1. Slug Format Validation
```
AND(
  NOT(ISBLANK(Slug__c)),
  NOT(REGEX(Slug__c, "^[a-z0-9-]+$"))
)
```
Error: "Slug must contain only lowercase letters, numbers, and hyphens"

### 2. Slug Uniqueness
Create a unique index on `Slug__c` field to prevent duplicates.

### 3. Published Requires Content
```
AND(
  Is_Published__c = TRUE,
  OR(ISBLANK(Body__c), ISBLANK(Heading__c), ISBLANK(Category__c))
)
```
Error: "Published articles must have a title, content, and category"

---

## API Queries Used by Admin

### List Articles (with filters)
```sql
SELECT Id, Heading__c, Subtitle__c, Excerpt__c, Slug__c,
       Header_Image_URL__c, Category__c, Tags__c,
       Article_Date__c, Status__c, Is_Published__c, Is_Featured__c,
       Reading_Time_Minutes__c, View_Count__c, Author_Name__c,
       CreatedDate, LastModifiedDate
FROM Article__c
WHERE Status__c = :status  -- optional filter
ORDER BY CreatedDate DESC
LIMIT :limit OFFSET :offset
```

### Get Single Article (for editing)
```sql
SELECT Id, Heading__c, Subtitle__c, Body__c, Excerpt__c, Slug__c,
       Header_Image_URL__c, Category__c, Tags__c,
       Article_Date__c, Status__c, Is_Published__c, Is_Featured__c,
       Reading_Time_Minutes__c, Author_Name__c, Author__c,
       Meta_Title__c, Meta_Description__c
FROM Article__c
WHERE Id = :id
```

---

## CRUD Operations

### Create Article
```http
POST /services/data/v60.0/sobjects/Article__c
Content-Type: application/json

{
  "Heading__c": "Article Title",
  "Body__c": "<p>Rich HTML content...</p>",
  "Slug__c": "article-title",
  "Category__c": "Engineering",
  "Status__c": "Draft",
  "Is_Published__c": false,
  "Article_Date__c": "2026-01-16"
}
```

### Update Article
```http
PATCH /services/data/v60.0/sobjects/Article__c/{id}
Content-Type: application/json

{
  "Heading__c": "Updated Title",
  "Status__c": "Published",
  "Is_Published__c": true
}
```

### Delete Article
```http
DELETE /services/data/v60.0/sobjects/Article__c/{id}
```

---

## Image Storage Strategy

Images are stored in **Cloudflare R2**, not Salesforce:

1. Featured images: URL stored in `Header_Image_URL__c`
2. Inline images: URLs embedded in `Body__c` HTML
3. R2 folder structure: `/articles/YYYY/MM/filename.jpg`

This approach:
- Avoids Salesforce storage limits and costs
- Provides CDN-delivered images globally
- Allows unlimited bandwidth (R2 has no egress fees)

---

## Testing Checklist

Before deploying admin functionality, verify:

- [ ] API user can query Article__c with all required fields
- [ ] API user can create new Article__c records
- [ ] API user can update existing Article__c records
- [ ] API user can delete Article__c records
- [ ] Slug__c uniqueness is enforced
- [ ] Status__c picklist has all required values
- [ ] Rich Text Area accepts HTML with image tags
- [ ] Field-level security allows all CRUD operations

---

# Question & Exercise Objects

The following objects support tutorials with embedded questions and JavaScript coding exercises.

---

## Question__c Object

Stores quiz questions for tutorials and coding challenges for exercises.

### Required Fields

| Field API Name | Type | Length | Description | Required |
|----------------|------|--------|-------------|----------|
| `Name` | Auto Number | - | Format: `Q-{0000}` | Auto |
| `Question_Text__c` | Rich Text Area | 32000 | Question content (supports images, formatting) | Yes |
| `Question_Type__c` | Picklist | - | Type of question (see values below) | Yes |
| `Is_Active__c` | Checkbox | - | Whether question is available for use | Yes |

### Optional Fields

| Field API Name | Type | Length | Description |
|----------------|------|--------|-------------|
| `Difficulty_Level__c` | Picklist | - | Question difficulty |
| `Explanation__c` | Rich Text Area | 32000 | Shown after user answers (explains correct answer) |
| `Code_Snippet__c` | Long Text Area | 32000 | Starter code for coding exercises |
| `Code_Language__c` | Picklist | - | Programming language (JavaScript, TypeScript, etc.) |
| `Hint__c` | Long Text Area | 2000 | Optional hint for users |
| `Points__c` | Number | 3,0 | Point value (default: 1) |
| `Topic__c` | Lookup(Topic__c) | - | Related topic for categorization |
| `Tags__c` | Long Text Area | 1000 | Comma-separated tags for search |

### Question_Type__c Picklist Values

| Value | Description |
|-------|-------------|
| `Multiple_Choice` | Single correct answer from options |
| `True_False` | Boolean question |
| `Multiple_Select` | Multiple correct answers allowed |
| `Fill_Blank` | User types the answer |
| `Code_Completion` | User writes code, validated by test cases |

### Difficulty_Level__c Picklist Values

| Value | Description |
|-------|-------------|
| `Beginner` | New to the topic |
| `Intermediate` | Some experience required |
| `Advanced` | Expert-level challenge |

### Code_Language__c Picklist Values

| Value | Description |
|-------|-------------|
| `JavaScript` | JavaScript (ES6+) |
| `TypeScript` | TypeScript |
| `Python` | Python 3 |
| `HTML` | HTML5 |
| `CSS` | CSS3 |
| `SQL` | SQL queries |

---

## Answer__c Object

Stores answer options for multiple choice and true/false questions.

### Fields

| Field API Name | Type | Length | Description | Required |
|----------------|------|--------|-------------|----------|
| `Name` | Auto Number | - | Format: `A-{0000}` | Auto |
| `Question__c` | Master-Detail | - | Parent question | Yes |
| `Answer_Text__c` | Long Text Area | 10000 | Answer content | Yes |
| `Is_Correct__c` | Checkbox | - | Whether this is a correct answer | Yes |
| `Sort_Order__c` | Number | 2,0 | Display order (1, 2, 3, 4...) | Yes |
| `Feedback__c` | Long Text Area | 2000 | Shown when user selects this answer | No |
| `Answer_Code__c` | Text | 10 | Short code (A, B, C, D) | No |

### Validation Rules

**At least one correct answer:**
```
// Flow/Trigger: Ensure at least one Answer__c with Is_Correct__c = TRUE per Question__c
```

**True/False has exactly 2 answers:**
```
// For Question_Type__c = 'True_False', Answer count must equal 2
```

---

## Test_Case__c Object

Stores test cases for code completion questions. Used to validate user-submitted code.

### Fields

| Field API Name | Type | Length | Description | Required |
|----------------|------|--------|-------------|----------|
| `Name` | Auto Number | - | Format: `TC-{0000}` | Auto |
| `Question__c` | Master-Detail | - | Parent code question | Yes |
| `Test_Case_Name__c` | Text | 100 | Descriptive name shown to user | Yes |
| `Input_Parameters__c` | Long Text Area | 10000 | JSON input data | Yes |
| `Expected_Output__c` | Long Text Area | 10000 | JSON expected result | Yes |
| `Is_Hidden__c` | Checkbox | - | Hidden from user (only used for grading) | Yes |
| `Is_Sample__c` | Checkbox | - | Shown as example in instructions | Yes |
| `Description__c` | Long Text Area | 1000 | Human-readable test description | No |
| `Sort_Order__c` | Number | 2,0 | Display order | Yes |
| `Points__c` | Number | 2,0 | Points for passing this test | No |
| `Timeout_Seconds__c` | Number | 3,0 | Max execution time (default: 5) | No |

### Example Test Case Data

```json
// Input_Parameters__c
{
  "args": [3, 4],
  "context": {}
}

// Expected_Output__c
{
  "result": true,
  "type": "boolean"
}
```

### Test Case Visibility Rules

| Is_Hidden__c | Is_Sample__c | Behavior |
|--------------|--------------|----------|
| false | true | Shown in instructions as example |
| false | false | Shown in test results |
| true | false | Hidden, used only for final grading |
| true | true | Invalid combination |

---

## Article_Question__c Object (Junction)

Links questions to tutorials/exercises. Allows questions to be reused across multiple articles.

### Fields

| Field API Name | Type | Length | Description | Required |
|----------------|------|--------|-------------|----------|
| `Name` | Auto Number | - | Format: `AQ-{0000}` | Auto |
| `Article__c` | Master-Detail | - | Parent article (Tutorial or Exercise) | Yes |
| `Question__c` | Lookup | - | Linked question | Yes |
| `Sort_Order__c` | Number | 3,0 | Order of question in article | Yes |
| `Section_Title__c` | Text | 100 | Optional header before question | No |
| `Is_Required__c` | Checkbox | - | Must complete to proceed | No |

### Usage Notes

- For **Tutorials**: Multiple questions linked via Article_Question__c
- For **Exercises**: Typically one Code_Completion question linked
- Sort_Order__c determines display order in the tutorial
- Section_Title__c allows grouping questions (e.g., "Practice Questions")

---

## API Queries for Questions

### Get Questions for a Tutorial/Exercise

```sql
SELECT Id, Question__c, Sort_Order__c, Section_Title__c, Is_Required__c,
       Question__r.Name, Question__r.Question_Text__c, Question__r.Question_Type__c,
       Question__r.Difficulty_Level__c, Question__r.Explanation__c,
       Question__r.Code_Snippet__c, Question__r.Code_Language__c, Question__r.Hint__c
FROM Article_Question__c
WHERE Article__c = :articleId
  AND Question__r.Is_Active__c = TRUE
ORDER BY Sort_Order__c ASC
```

### Get Answers for a Question

```sql
SELECT Id, Answer_Text__c, Is_Correct__c, Sort_Order__c, Feedback__c, Answer_Code__c
FROM Answer__c
WHERE Question__c = :questionId
ORDER BY Sort_Order__c ASC
```

### Get Test Cases for a Code Question

```sql
SELECT Id, Test_Case_Name__c, Input_Parameters__c, Expected_Output__c,
       Is_Hidden__c, Is_Sample__c, Description__c, Sort_Order__c, Points__c
FROM Test_Case__c
WHERE Question__c = :questionId
ORDER BY Sort_Order__c ASC
```

---

## Field-Level Security Updates

### API User Permission Set: `Question_Admin`

Grant **Read + Edit + Create + Delete** access to:
- All `Question__c` fields
- All `Answer__c` fields
- All `Test_Case__c` fields
- All `Article_Question__c` fields

---

## Testing Checklist for Questions & Exercises

- [ ] Question__c object exists with all fields
- [ ] Answer__c object exists with Master-Detail to Question__c
- [ ] Test_Case__c object exists with Master-Detail to Question__c
- [ ] Article_Question__c junction exists
- [ ] Article__c has Article_Type__c picklist
- [ ] Article__c has Starter_Code__c, Solution_Code__c, Instructions__c fields
- [ ] API user can CRUD all question-related objects
- [ ] Question_Type__c picklist has all required values
- [ ] Difficulty_Level__c picklist has Beginner/Intermediate/Advanced
- [ ] Code_Language__c picklist includes JavaScript

---

# Content Creation Guide

This section explains how to create different types of content in Cloud Climb.

---

## Creating a Blog Post

1. Navigate to `/admin/posts/new`
2. Fill in the following fields:
   - **Title**: Article headline
   - **Slug**: URL path (auto-generated from title, e.g., `building-scalable-systems`)
   - **Body**: Rich text content - use the editor to add headings, lists, images, code blocks
   - **Excerpt**: 1-2 sentence summary (shown on cards and SEO)
   - **Featured Image**: Upload via image picker (displayed on cards and article header)
   - **Category**: Choose from Engineering, Tech, Tutorials, or Certification Tips
   - **Tags**: Comma-separated keywords (e.g., `architecture, scalability, events`)
3. Set **Article Type** to "Blog Post" (default)
4. Set **Status** to "Published" and check "Is Published"
5. Click **Save**

### Tips for Blog Posts
- Use descriptive headings (H2, H3) to structure content
- Include code examples with syntax highlighting
- Add images to break up long text
- Write an engaging excerpt - it appears on the homepage cards

---

## Creating an Exercise

1. Navigate to `/admin/posts/new`
2. Fill in the following fields:
   - **Title**: Exercise name (e.g., "Integer Hypotenuse")
   - **Slug**: URL path (e.g., `integer-hypotenuse`)
   - **Category**: Set to "Exercises"
   - **Featured Image**: Use a code/programming related image
   - **Body**: Instructions using HTML with code blocks:

```html
<h2>Challenge</h2>
<p>Given two positive integers <code>a</code> and <code>b</code> representing the legs of a right triangle, determine if the hypotenuse is an integer.</p>

<h3>Input</h3>
<ul>
  <li><code>a</code>: A positive integer (first leg)</li>
  <li><code>b</code>: A positive integer (second leg)</li>
</ul>

<h3>Output</h3>
<p>Return <code>true</code> if the hypotenuse is an integer, <code>false</code> otherwise.</p>

<h3>Examples</h3>
<ul>
  <li><code>isIntegerHypotenuse(3, 4)</code> → <code>true</code></li>
  <li><code>isIntegerHypotenuse(1, 2)</code> → <code>false</code></li>
</ul>
```

3. Set **Article Type** to "Exercise"
4. Fill in **Starter Code** (plain JavaScript):

```javascript
function isIntegerHypotenuse(a, b) {
  // Your code here

}
```

5. Fill in **Solution Code** (reference solution):

```javascript
function isIntegerHypotenuse(a, b) {
  const c = Math.sqrt(a * a + b * b);
  return Number.isInteger(c);
}
```

6. Set **Status** to "Published"
7. Click **Save**

### Exercise Display
- Exercises display like blog posts with a featured image
- Starter code is shown with a "Try on CodePen" button
- Solution code is hidden behind a collapsible "Show Solution" section
- Related exercises appear at the bottom

---

## Creating a Tutorial

1. Navigate to `/admin/posts/new`
2. Fill in the same fields as Blog Post
3. Set **Article Type** to "Tutorial"
4. Write educational content in the Body
5. Create questions in `/admin/questions`:
   - Set Question Type (Multiple Choice, True/False, etc.)
   - Add answer options with one or more correct answers
   - Add explanation text for feedback
6. Link questions to the tutorial via Article_Question__c junction in Salesforce
7. Set **Status** to "Published"
8. Click **Save**

### Tutorial Display
- Tutorials display with educational content
- Embedded questions appear with interactive answer selection
- Feedback is shown after answering each question

---

## Field Reference Quick Guide

| Field | Blog Post | Exercise | Tutorial |
|-------|-----------|----------|----------|
| Title | Required | Required | Required |
| Slug | Required | Required | Required |
| Body | Required (content) | Required (instructions) | Required (content) |
| Excerpt | Recommended | Recommended | Recommended |
| Featured Image | Required | Required | Required |
| Category | Required | "Exercises" | "Tutorials" |
| Article Type | Blog_Post | Exercise | Tutorial |
| Starter Code | N/A | Required | N/A |
| Solution Code | N/A | Required | N/A |
| Questions | N/A | N/A | Via junction |

---

## Image Guidelines

- **Featured images**: 1200x630px recommended (2:1 aspect ratio)
- **Inline images**: Any size, will be responsive
- **File formats**: JPEG, PNG, WebP
- **Storage**: Images are uploaded to Cloudflare R2 via the admin image picker

---

## Publishing Workflow

1. **Draft**: Work in progress, not visible on site
2. **Pending Review**: Ready for editorial review
3. **Published**: Live on the public site
4. **Archived**: Removed from public view

To publish content:
1. Set Status to "Published"
2. Check "Is Published" checkbox
3. Save

To unpublish:
1. Uncheck "Is Published" checkbox
2. Save (content immediately hidden from public)

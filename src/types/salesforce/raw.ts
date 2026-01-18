/**
 * Raw Salesforce Types for Cloud Climb
 *
 * These types mirror the exact Salesforce schema.
 * Based on the actual Article__c, Certification__c, and Topic__c objects.
 */

// Base record type
export interface SF_Record {
  Id: string;
  Name?: string;
  CreatedDate?: string;
  LastModifiedDate?: string;
}

// Contact (Author)
export interface SF_Contact extends SF_Record {
  RecordTypeId?: string;
  FirstName?: string;
  LastName?: string;
  Email?: string;
  Title?: string;
  Description?: string;
  Profile_Image_URL__c?: string;
}

// Certification__c
export interface SF_Certification__c extends SF_Record {
  Certification_Code__c?: string;
  Description__c?: string;
  Provider__c?: string;
  Difficulty_Level__c?: string;
  Official_Exam_Duration__c?: number;
  Official_Passing_Score__c?: number;
  Official_Question_Count__c?: number;
  Exam_Cost__c?: number;
  Prerequisites__c?: string;
  Is_Active__c?: boolean;
  Last_Updated_Date__c?: string;
}

// Topic__c
export interface SF_Topic__c extends SF_Record {
  Certification__c?: string;
  Certification__r?: SF_Certification__c;
  Topic_Code__c?: string;
  Description__c?: string;
  Exam_Weight__c?: number;
  Hierarchy_Level__c?: number;
  Parent_Topic__c?: string;
  Parent_Topic__r?: SF_Topic__c;
  Sort_Order__c?: number;
  Is_Active__c?: boolean;
}

// Article__c - Main content object
export interface SF_Article__c extends SF_Record {
  // Content fields
  Heading__c?: string;
  Subtitle__c?: string;
  Body__c?: string;
  Content__c?: string;
  Excerpt__c?: string;
  Slug__c?: string;

  // Date fields
  Article_Date__c?: string;
  Publish_Date__c?: string;
  Last_Modified_Date__c?: string;

  // Status fields
  Status__c?: string; // Draft, Pending Review, Published, Archived
  Is_Published__c?: boolean;
  Is_Featured__c?: boolean;
  Is_Premium__c?: boolean;

  // Classification
  Article_Type__c?: string; // Match Preview, Match Recap, etc.
  Category__c?: string; // Certification Tips, Study Guides, News, Tutorials
  Sport_Type__c?: string;
  Tags__c?: string;

  // Author
  Author_Name__c?: string;
  Author__c?: string;
  Author__r?: SF_Contact;

  // Source/Attribution
  Source__c?: string;
  Article_URL__c?: string;

  // Media
  Header_Image_URL__c?: string;

  // SEO
  Meta_Title__c?: string;

  // Metrics
  Reading_Time__c?: number;
  Reading_Time_Minutes__c?: number;
  Word_Count__c?: number;
  View_Count__c?: number;
  Like_Count__c?: number;

  // External ID
  External_ID__c?: string;

  // Related objects
  Certification__c?: string;
  Certification__r?: SF_Certification__c;
  Topic__c?: string;
  Topic__r?: SF_Topic__c;
  Related_Team__c?: string;
  Related_Player__c?: string;
  Related_Match__c?: string;
  Match__c?: string;
}

// Lead (Newsletter)
export interface SF_Lead extends SF_Record {
  FirstName?: string;
  LastName?: string;
  Email?: string;
  Company?: string;
  LeadSource?: string;
  Status?: string;
  Description?: string;
}

// =============================================================================
// Question & Exercise Objects
// =============================================================================

// Question__c - Quiz and exercise questions
export interface SF_Question__c extends SF_Record {
  Question_Text__c?: string;
  Question_Type__c?: string; // Multiple_Choice, True_False, Multiple_Select, Fill_Blank, Code_Completion
  Difficulty_Level__c?: string; // Beginner, Intermediate, Advanced
  Explanation__c?: string;
  Code_Snippet__c?: string;
  Code_Language__c?: string; // JavaScript, TypeScript, Python, HTML, CSS, SQL
  Hint__c?: string;
  Points__c?: number;
  Is_Active__c?: boolean;
  Topic__c?: string;
  Topic__r?: SF_Topic__c;
  Tags__c?: string;
}

// Answer__c - Multiple choice answer options
export interface SF_Answer__c extends SF_Record {
  Question__c?: string;
  Question__r?: SF_Question__c;
  Answer_Text__c?: string;
  Is_Correct__c?: boolean;
  Sort_Order__c?: number;
  Feedback__c?: string;
  Answer_Code__c?: string;
}

// Test_Case__c - Code exercise test cases
export interface SF_Test_Case__c extends SF_Record {
  Question__c?: string;
  Question__r?: SF_Question__c;
  Test_Case_Name__c?: string;
  Input_Parameters__c?: string; // JSON
  Expected_Output__c?: string; // JSON
  Is_Hidden__c?: boolean;
  Is_Sample__c?: boolean;
  Description__c?: string;
  Sort_Order__c?: number;
  Points__c?: number;
  Timeout_Seconds__c?: number;
}

// Article_Question__c - Junction linking articles to questions
export interface SF_Article_Question__c extends SF_Record {
  Article__c?: string;
  Article__r?: SF_Article__c;
  Question__c?: string;
  Question__r?: SF_Question__c;
  Sort_Order__c?: number;
  Section_Title__c?: string;
  Is_Required__c?: boolean;
}

// Extended Article with tutorial/exercise fields
export interface SF_Article__c_Extended extends SF_Article__c {
  Starter_Code__c?: string;
  Solution_Code__c?: string;
  Instructions__c?: string;
}

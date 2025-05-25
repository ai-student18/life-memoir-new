
/**
 * Type definitions for the generate-biography-draft function
 */

export interface BiographyRequest {
  biographyId: string;
}

export interface QuestionAnswer {
  question: string;
  answer: string;
}

export interface TOCChapter {
  title: string;
  description: string;
}

export interface BiographySettings {
  language: string;
  tone: string;
  writing_style: string;
}

export interface GeneratedDraftResult {
  message: string;
  draftId: string;
  chapters: number;
  full_content_length: number;
}

export interface ErrorResponse {
  error: string;
}


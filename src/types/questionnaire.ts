import type { Tables, TablesInsert } from '@/integrations/supabase/types';

// Replaced with Supabase generated type
// export interface Question {
//   id: string;
//   question_text: string;
//   question_order: number;
//   created_at: string;
// }
export type Question = Tables<'biography_questions'>;


// This Answer type is used for form data and mutation payloads.
// It aligns well with TablesInsert<'biography_answers'>.
export interface Answer {
  id?: string; // Optional for new answers
  biography_id: string;
  question_id: string;
  answer_text: string | null;
  updated_at?: string; // Optional, Supabase handles this on update
}

// Type for answers as fetched from the database
export type FetchedAnswer = Tables<'biography_answers'>;

export interface QuestionWithAnswer extends Question {
  answer: Answer | null; // Could also be FetchedAnswer if representing displayed data
}

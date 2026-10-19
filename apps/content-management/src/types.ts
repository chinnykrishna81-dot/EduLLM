// Types matching EDULLM_Content JSON schemas

export interface PackageSummary {
  id: string;
  title: string;
  subject: string;
  grade: number;
  board: string;
  chapter_id: string;
}

// chapter.json schema
export interface ChapterImage {
  src: string;
  alt: string;
  caption: string;
}

export interface Subtopic {
  heading: string;
  explanation: string;
}

export interface Section {
  id: string;
  title: string;
  colors: [string, string];
  definition: string;
  key_points: string[];
  equations: string[];
  worked_example: string;
  visual_flow: string;
  images: ChapterImage[];
  subtopics: Subtopic[];
}

export interface EndMcq {
  id: string;
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;
  concept_id: string;
}

export interface Chapter {
  schema_version: string;
  chapter_id: string;
  subject: string;
  grade: number;
  board: string;
  title: string;
  sections: Section[];
  end_of_chapter_mcqs: EndMcq[];
}

// MCQ (Type 1) question_bank.json schema
export interface McqOption {
  id: string;
  text: string;
}

export interface McqQuestion {
  question_id: string;
  question_type: string;
  subject: string;
  chapter: string;
  topic: string;
  subtopic: string;
  difficulty: string;
  marks: number;
  question: string;
  options: McqOption[];
  correct_option: string;
  short_explanation: string;
  review_required?: boolean;
  valid_for_scoring?: boolean;
}

export interface McqBank {
  metadata: { title: string; total_questions: number };
  questions: McqQuestion[];
}

// Type 2 illustrated question_bank.json schema
export interface T2Option {
  id: string;
  text: string;
  is_correct: boolean;
}

export interface Subquestion {
  id: string;
  question: string;
  options: T2Option[];
  correct_option: string;
  answer: string;
  incorrect_answer?: string;
  marks: number;
  complexity: string;
  feedback: string;
}

export interface Type2Question {
  id: string;
  chapter: string;
  topic: string;
  subtopic: string;
  pattern_id: string;
  question_type: string;
  classification: string;
  complexity: string;
  marks: number;
  main_question: string;
  scenario?: string;
  subquestions: Subquestion[];
  explanation_image_ref?: string;
  question_image_ref?: string;
  explanation_image_alt?: string;
  explanation_image_caption?: string;
}

export interface Type2Bank {
  schema_version: string;
  subject: string;
  chapter: string;
  question_count: number;
  questions: Type2Question[];
}

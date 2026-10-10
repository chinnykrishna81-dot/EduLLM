export type ChapterStatus = 'not_started' | 'processing' | 'draft' | 'in_review' | 'published';

export type Subject = 'science' | 'maths' | 'physics' | 'chemistry' | 'biology';

export interface Chapter {
  id: string;
  subject: Subject;
  name: string;
  chapterNumber: number;
  status: ChapterStatus;
  topicsCount: number;
  questionsCount: number;
  imagesCount: number;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

export type ProcessingStep =
  | 'pdf_parsing'
  | 'concept_extraction'
  | 'generating_concept_pages'
  | 'transforming_questions'
  | 'generating_image_specs'
  | 'building_attempt_pools';

export type StepStatus = 'pending' | 'running' | 'done' | 'error';

export interface ProcessingStatus {
  chapterId: string;
  overall: ChapterStatus;
  steps: Record<ProcessingStep, { status: StepStatus; detail?: string }>;
  error?: string;
}

export interface ConceptPage {
  id: string;
  topicId: string;
  topicTitle: string;
  title: string;
  sequence: number;
  blocks: Block[];
  reviewStatus: 'pending' | 'approved' | 'rejected';
}

export interface Block {
  id: string;
  type: 'text' | 'remember' | 'image';
  content?: string;
  imageSpec?: string;
}

export interface Question {
  id: string;
  topicId: string;
  topicTitle: string;
  type: 1 | 2;
  section: 'A' | 'B' | 'C' | 'D';
  marks: number;
  question: string;
  options?: string[];
  correctAnswer?: string;
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'hots';
  reviewStatus: 'pending' | 'approved' | 'rejected';
  attemptPool?: number;
}

export interface ImageSpec {
  id: string;
  topicId: string;
  topicTitle: string;
  conceptMapping: string;
  purpose: string;
  elements: string;
  labels: string;
  generationPrompt: string;
  generatedUrl?: string;
  reviewStatus: 'pending' | 'generated' | 'approved' | 'rejected';
}

export interface DraftContent {
  chapterId: string;
  chapterName: string;
  subject: Subject;
  topics: { id: string; title: string; pagesCount: number; approvedPages: number }[];
  conceptPages: ConceptPage[];
  questions: Question[];
  images: ImageSpec[];
  attemptPools: Record<number, string[]>;
}

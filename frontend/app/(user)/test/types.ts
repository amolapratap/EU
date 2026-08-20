export type QuizQuestion = {
  id: string;
  question_md: string;
  options: string[];
};

export type QuizQuestionsResponse = {
  total_questions: number;
  questions: QuizQuestion[];
  paper: QuizPaperMeta;
};

export type QuizPaperListItem = {
  paper_id: string;
  subject_code: string;
  name?: string;
  type?: string;
  paper_type?: string;
  year?: number | null;
  objective_questions: number;
};

export type QuizPaperListResponse = {
  total_papers: number;
  papers: QuizPaperListItem[];
};

export type QuizPaperMeta = Omit<PaperMeta, "_id"> & {
  id: string;
};

export type AnswerDetail = {
  question_id: string;
  question_text: string;
  options: string[];
  user_selected_index: number;
  user_selected_text: string;
  correct_index: number;
  correct_text: string;
  is_correct: boolean;
  explanation: string;
};

export type QuizSubmissionResponse = {
  attempt_id: string;
  score: number;
  total: number;
  percentage: number;
  answers_detail: AnswerDetail[];
};

export type QuizAttempt = {
  attempt_id: string;
  subject_code: string;
  subject_name?: string;
  year?: number | null;
  score: number;
  total: number;
  percentage: number;
  submitted_at: string;
  time_taken: number;
};

export type QuizHistoryResponse = {
  total_attempts: number;
  attempts: QuizAttempt[];
};

export type QuizStatisticsResponse = {
  total_attempts: number;
  average_score: number;
  average_percentage: number;
  best_score: number;
  worst_score: number;
  total_time_spent: number;
};

export type QuizResultsResponse = QuizSubmissionResponse & {
  time_taken: number;
  submitted_at: string;
};

export type PaperMeta = {
  _id: string;
  name?: string;
  subject_code?: string;
  year?: number;
  exam_type?: string;
  paper_type?: string;
  type?: string;
};

export type QuestionStatus =
  | "not-visited"
  | "not-answered"
  | "answered"
  | "marked"
  | "answered-marked";

export type ExamPhase = "loading" | "instructions" | "exam" | "submitting" | "results" | "error";

export type AnswerMap = Record<string, number>;

export type StatusMap = Record<string, QuestionStatus>;

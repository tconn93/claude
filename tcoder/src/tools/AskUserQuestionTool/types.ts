export interface QuestionOption {
  label: string;
  description?: string;
}

export interface Question {
  question: string;
  header?: string;
  multiSelect?: boolean;
  options: QuestionOption[];
}

export interface AskUserQuestionInput {
  questions: Question[];
  preview?: boolean;
}

export interface AskUserQuestionOutput {
  answers: Record<string, string | string[]>;
}

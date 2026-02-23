export interface AskInput {
  prompt: string;
  model?: string;
  timeout_ms?: number;
  working_directory?: string;
}

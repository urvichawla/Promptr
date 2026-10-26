export type Prompt = {
  id: number;
  title: string;
  content: string;
  tags: string[];
  favorite: boolean;
  createdAt: string;
  updatedAt: string;
};

export type PromptDraft = {
  title: string;
  content: string;
  tags: string[];
};


export interface Story {
  id?: string;
  title: string;
  originalText: string;
  enhancedText?: string;
  createdAt?: string;
  userId?: string;
}

export interface StoriesContextState {
  storyInput: string;
  setStoryInput: (input: string) => void;
  enhancedStory: string;
  setEnhancedStory: (story: string) => void;
  lastSaved: Date | null;
  setLastSaved: (date: Date | null) => void;
  storyTitle: string;
  setStoryTitle: (title: string) => void;
  saveStory: () => Promise<void>;
  isSaving: boolean;
}

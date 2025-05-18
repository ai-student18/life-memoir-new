
import { supabase } from '@/integrations/supabase/client';

export interface EnhanceStoryParams {
  text: string;
  systemInstruction?: string;
}

export interface EnhanceStoryResponse {
  enhancedText: string;
}

/**
 * Service to handle story enhancement API calls
 */
export const enhanceStory = async ({ text, systemInstruction }: EnhanceStoryParams): Promise<string> => {
  if (!text || text.trim() === '') {
    throw new Error('No text provided for enhancement');
  }

  try {
    const { data, error } = await supabase.functions.invoke('enhance-story', {
      body: { 
        text, 
        systemInstruction 
      }
    });

    if (error) {
      console.error('Supabase function error:', error);
      throw new Error(error.message || 'Failed to enhance story');
    }

    if (!data || !data.enhancedText) {
      console.error('Invalid response format:', data);
      throw new Error('No enhanced text returned from API');
    }

    return data.enhancedText;
  } catch (err) {
    const errorMessage = err instanceof Error 
      ? err.message 
      : 'An unexpected error occurred while enhancing your story';
    
    console.error('Story enhancement error:', err);
    throw new Error(errorMessage);
  }
};


import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface UseStoryEnhancerProps {
  systemInstruction?: string;
}

export const useStoryEnhancer = (props: UseStoryEnhancerProps = {}) => {
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { systemInstruction } = props;

  const enhanceStory = async (text: string): Promise<string> => {
    if (!text || text.trim() === '') {
      throw new Error('No text provided for enhancement');
    }

    setIsEnhancing(true);
    setError(null);

    try {
      const { data, error } = await supabase.functions.invoke('enhance-story', {
        body: { 
          text, 
          systemInstruction 
        }
      });

      if (error) {
        throw new Error(error.message || 'Failed to enhance story');
      }

      if (!data || !data.enhancedText) {
        throw new Error('No enhanced text returned from API');
      }

      setIsEnhancing(false);
      return data.enhancedText;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to enhance story';
      setIsEnhancing(false);
      setError(errorMessage);
      throw err;
    }
  };

  return {
    enhanceStory,
    isEnhancing,
    error
  };
};


import { useState } from 'react';
import { enhanceStory as enhanceStoryAPI, EnhanceStoryParams } from '@/services/storyEnhancementService';
import { useToast } from '@/components/ui/use-toast';

export interface UseStoryEnhancerProps {
  systemInstruction?: string;
}

/**
 * Hook for enhancing stories with AI
 */
export const useStoryEnhancer = (props: UseStoryEnhancerProps = {}) => {
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { systemInstruction } = props;
  const { toast } = useToast();

  const enhanceStory = async (text: string): Promise<string> => {
    if (!text || text.trim() === '') {
      const errorMsg = 'No text provided for enhancement';
      toast({
        title: 'Error',
        description: errorMsg,
        variant: 'destructive',
      });
      throw new Error(errorMsg);
    }

    setIsEnhancing(true);
    setError(null);

    try {
      const params: EnhanceStoryParams = {
        text,
        systemInstruction
      };
      
      const enhancedText = await enhanceStoryAPI(params);
      
      setIsEnhancing(false);
      return enhancedText;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to enhance story';
      setIsEnhancing(false);
      setError(errorMessage);
      
      toast({
        title: 'Enhancement Failed',
        description: errorMessage,
        variant: 'destructive',
      });
      
      throw err;
    }
  };

  return {
    enhanceStory,
    isEnhancing,
    error
  };
};

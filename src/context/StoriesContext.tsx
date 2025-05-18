
import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from "@/components/ui/sonner";
import { StoriesContextState } from '@/types/story';

const StoriesContext = createContext<StoriesContextState | undefined>(undefined);

interface StoriesProviderProps {
  children: ReactNode;
}

export const StoriesProvider: React.FC<StoriesProviderProps> = ({ children }) => {
  const [storyInput, setStoryInput] = useState('');
  const [enhancedStory, setEnhancedStory] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [autoSaveTimeout, setAutoSaveTimeout] = useState<NodeJS.Timeout | null>(null);
  const [storyTitle, setStoryTitle] = useState('');

  // Auto-save draft functionality
  useEffect(() => {
    if (storyInput && storyInput.trim() !== '') {
      if (autoSaveTimeout) clearTimeout(autoSaveTimeout);
      
      const timeout = setTimeout(() => {
        localStorage.setItem('storyDraft', storyInput);
        setLastSaved(new Date());
      }, 2000);
      
      setAutoSaveTimeout(timeout);
    }
  }, [storyInput]);

  // Load draft on initial render
  useEffect(() => {
    const savedDraft = localStorage.getItem('storyDraft');
    if (savedDraft) {
      setStoryInput(savedDraft);
      setLastSaved(new Date());
    }
  }, []);

  // Clean up timeouts when component unmounts
  useEffect(() => {
    return () => {
      if (autoSaveTimeout) clearTimeout(autoSaveTimeout);
    };
  }, [autoSaveTimeout]);

  const saveStory = async () => {
    if (!storyTitle.trim()) {
      toast.error("Please enter a title for your story");
      return;
    }

    setIsSaving(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        throw new Error("You must be logged in to save stories");
      }
      
      // Save the story to the database
      const { data, error } = await supabase
        .from('stories')
        .insert({
          user_id: session.user.id,
          title: storyTitle,
          original_text: storyInput,
          enhanced_text: enhancedStory || null
        })
        .select('id')
        .single();
      
      if (error) throw error;
      
      // Save as a file in storage
      if (data?.id) {
        const fileName = `${session.user.id}/${data.id}.txt`;
        const fileContent = enhancedStory || storyInput;
        
        // Convert text to a file object
        const blob = new Blob([fileContent], { type: 'text/plain' });
        const file = new File([blob], `${storyTitle}.txt`, { type: 'text/plain' });
        
        const { error: uploadError } = await supabase.storage
          .from('stories')
          .upload(fileName, file);
        
        if (uploadError) throw uploadError;
        
        // Update the story record with file path
        await supabase
          .from('stories')
          .update({ file_path: fileName })
          .eq('id', data.id);
      }
      
      toast.success("Your story has been saved!");
      setStoryTitle('');
    } catch (error: any) {
      console.error("Error saving story:", error);
      toast.error(error.message || "Failed to save your story. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const value: StoriesContextState = {
    storyInput,
    setStoryInput,
    enhancedStory,
    setEnhancedStory,
    lastSaved,
    setLastSaved,
    storyTitle,
    setStoryTitle,
    saveStory,
    isSaving
  };

  return (
    <StoriesContext.Provider value={value}>
      {children}
    </StoriesContext.Provider>
  );
};

export const useStories = (): StoriesContextState => {
  const context = useContext(StoriesContext);
  if (context === undefined) {
    throw new Error('useStories must be used within a StoriesProvider');
  }
  return context;
};

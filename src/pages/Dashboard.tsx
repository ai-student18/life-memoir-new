
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import { LogOut, Settings } from 'lucide-react';
import { useStoryEnhancer } from '@/hooks/useStoryEnhancer';
import StoryInputSection from '@/components/dashboard/StoryInputSection';
import StoryOutputSection from '@/components/dashboard/StoryOutputSection';
import SaveStoryDialog from '@/components/dashboard/SaveStoryDialog';
import AISettingsDialog from '@/components/dashboard/AISettingsDialog';

const Dashboard = () => {
  const [session, setSession] = useState(null);
  const [storyInput, setStoryInput] = useState('');
  const [enhancedStory, setEnhancedStory] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [autoSaveTimeout, setAutoSaveTimeout] = useState(null);
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [storyTitle, setStoryTitle] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [systemInstruction, setSystemInstruction] = useState(
    'Enhance this life story with improved narrative flow, correct any grammar or spelling errors, and make it more engaging to read.'
  );
  const navigate = useNavigate();
  
  // Use our enhanced hook with the system instruction
  const { enhanceStory, isEnhancing, error } = useStoryEnhancer({ 
    systemInstruction 
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate('/auth');
        return;
      }
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        if (!session) navigate('/auth');
      }
    );

    return () => {
      subscription?.unsubscribe();
      if (autoSaveTimeout) clearTimeout(autoSaveTimeout);
    };
  }, [navigate]);

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
    
    // Load saved system instruction if available
    const savedInstruction = localStorage.getItem('systemInstruction');
    if (savedInstruction) {
      setSystemInstruction(savedInstruction);
    }
  }, []);

  const handleEnhanceStory = async () => {
    if (!storyInput || storyInput.trim() === '') {
      toast.error("Please enter your story before enhancing");
      return;
    }
    
    try {
      const enhancedText = await enhanceStory(storyInput);
      setEnhancedStory(enhancedText);
      toast.success("Your story has been enhanced!");
    } catch (error) {
      console.error("Error enhancing story:", error);
      toast.error(error instanceof Error ? error.message : "Failed to enhance your story. Please try again.");
    }
  };

  const saveSystemInstruction = () => {
    localStorage.setItem('systemInstruction', systemInstruction);
    setIsSettingsOpen(false);
    toast.success("AI instruction saved!");
  };

  const handleSaveStory = async () => {
    if (!storyTitle.trim()) {
      toast.error("Please enter a title for your story");
      return;
    }

    setIsSaving(true);
    
    try {
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
      setIsSaveDialogOpen(false);
      setStoryTitle('');
    } catch (error) {
      console.error("Error saving story:", error);
      toast.error(error.message || "Failed to save your story. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error(error.message || "Failed to sign out");
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <header className="bg-white shadow-sm py-4 px-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-memoir-darkGray">LifeMemoir Dashboard</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsSettingsOpen(true)}>
            <Settings className="mr-2 h-4 w-4" />
            AI Settings
          </Button>
          <Button variant="outline" onClick={handleSignOut}>
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </header>
      
      <main className="container mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Story Input Section */}
          <StoryInputSection 
            storyInput={storyInput}
            setStoryInput={setStoryInput}
            lastSaved={lastSaved}
            handleEnhanceStory={handleEnhanceStory}
            isEnhancing={isEnhancing}
            openSaveDialog={() => setIsSaveDialogOpen(true)}
          />
          
          {/* Story Output Section */}
          <StoryOutputSection enhancedStory={enhancedStory} />
        </div>
      </main>
      
      {/* Save Dialog */}
      <SaveStoryDialog 
        isOpen={isSaveDialogOpen}
        onOpenChange={setIsSaveDialogOpen}
        storyTitle={storyTitle}
        setStoryTitle={setStoryTitle}
        handleSaveStory={handleSaveStory}
        isSaving={isSaving}
      />
      
      {/* AI Settings Dialog */}
      <AISettingsDialog 
        isOpen={isSettingsOpen}
        onOpenChange={setIsSettingsOpen}
        systemInstruction={systemInstruction}
        setSystemInstruction={setSystemInstruction}
        saveSystemInstruction={saveSystemInstruction}
      />
    </div>
  );
};

export default Dashboard;


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
import { StoriesProvider, useStories } from '@/context/StoriesContext';

// Main Dashboard content that uses the context
const DashboardContent = () => {
  const [session, setSession] = useState(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [systemInstruction, setSystemInstruction] = useState(
    'Enhance this life story with improved narrative flow, correct any grammar or spelling errors, and make it more engaging to read.'
  );
  const navigate = useNavigate();
  
  const { 
    storyInput, 
    setStoryInput,
    enhancedStory, 
    setEnhancedStory,
    lastSaved,
    storyTitle,
    setStoryTitle,
    saveStory,
    isSaving
  } = useStories();
  
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
    };
  }, [navigate]);

  // Load saved system instruction if available
  useEffect(() => {
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
    await saveStory();
    setIsSaveDialogOpen(false);
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

// Wrapper component that provides the StoriesContext
const Dashboard = () => {
  return (
    <StoriesProvider>
      <DashboardContent />
    </StoriesProvider>
  );
};

export default Dashboard;

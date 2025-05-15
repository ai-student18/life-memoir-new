
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { LogOut, Save, Settings } from 'lucide-react';
import { useStoryEnhancer } from '@/hooks/useStoryEnhancer';

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
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-memoir-darkGray">Your Story</h2>
            <Textarea
              value={storyInput}
              onChange={(e) => setStoryInput(e.target.value)}
              placeholder="Start writing or paste your life story here... (supports Hebrew and English)"
              className="min-h-[400px] font-sans"
              dir="auto"
            />
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">
                {lastSaved ? `Draft saved at ${lastSaved.toLocaleTimeString()}` : 'Start typing to autosave'}
              </span>
              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => setIsSaveDialogOpen(true)}
                >
                  <Save className="mr-2 h-4 w-4" />
                  Save Story
                </Button>
                <Button 
                  onClick={handleEnhanceStory} 
                  disabled={isEnhancing || !storyInput.trim()}
                >
                  {isEnhancing ? 'Enhancing...' : 'Enhance with AI'}
                </Button>
              </div>
            </div>
          </div>
          
          {/* Enhanced Story Output Section */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-memoir-darkGray">Your Edited Story</h2>
            <div className={`
              bg-white/70 backdrop-blur-md border rounded-lg p-6 shadow-lg min-h-[400px] transition-opacity duration-300
              ${enhancedStory ? 'opacity-100' : 'opacity-50'}
            `}>
              <div 
                className="font-serif whitespace-pre-line h-full" 
                dir="auto"
                style={{ 
                  minHeight: '370px', 
                  opacity: enhancedStory ? '1' : '0.7'
                }}
              >
                {enhancedStory || 'Your enhanced story will appear here after you click "Enhance with AI"...'}
              </div>
            </div>
          </div>
        </div>
      </main>
      
      {/* Save Dialog */}
      <Dialog open={isSaveDialogOpen} onOpenChange={setIsSaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Your Story</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Story Title</Label>
              <Input
                id="title"
                value={storyTitle}
                onChange={(e) => setStoryTitle(e.target.value)}
                placeholder="Enter a title for your story"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSaveDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveStory} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* AI Settings Dialog */}
      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>AI Enhancement Settings</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="system-instruction">System Instruction</Label>
              <Textarea
                id="system-instruction"
                value={systemInstruction}
                onChange={(e) => setSystemInstruction(e.target.value)}
                placeholder="Instructions for the AI on how to enhance your story"
                className="min-h-[150px]"
              />
              <p className="text-xs text-gray-500">
                Customize how the AI should enhance your stories. For example, instruct it to focus on improving narrative flow,
                fixing grammar, making it more emotional, etc.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSettingsOpen(false)}>Cancel</Button>
            <Button onClick={saveSystemInstruction}>Save Settings</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Dashboard;

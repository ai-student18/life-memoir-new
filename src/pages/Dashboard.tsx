
import React, { useState, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { toast } from "@/components/ui/sonner";

const Dashboard = () => {
  const [story, setStory] = useState("");
  const [editedStory, setEditedStory] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Auto-save effect
  useEffect(() => {
    if (story.trim().length > 0) {
      const saveTimer = setTimeout(() => {
        handleAutoSave();
      }, 2000);

      return () => clearTimeout(saveTimer);
    }
  }, [story]);

  // Mock auto-save function - would connect to backend in production
  const handleAutoSave = () => {
    setIsSaving(true);
    
    // Simulate saving delay
    setTimeout(() => {
      setIsSaving(false);
      // In a real app, this would save to a database
    }, 1000);
  };

  // Mock AI processing - would connect to AI service in production
  const processWithAI = () => {
    if (!story.trim()) {
      toast("Please enter your story first", {
        description: "The text area appears to be empty."
      });
      return;
    }

    setIsProcessing(true);
    
    // Simulate AI processing delay
    setTimeout(() => {
      // Mock AI enhancement - in production this would call an AI service
      const enhancedText = story
        .split('.')
        .map(sentence => {
          // Simple mock enhancement logic
          const trimmed = sentence.trim();
          if (trimmed.length > 0) {
            return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
          }
          return "";
        })
        .filter(s => s.length > 0)
        .join('. ');
      
      setEditedStory(enhancedText);
      setIsProcessing(false);
      toast("Your story has been enhanced!", {
        description: "The AI has processed your text."
      });
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-center mb-8 text-memoir-darkGray">Story Dashboard</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Text Input Section */}
          <div className="flex flex-col">
            <h2 className="text-xl font-semibold mb-3 text-memoir-darkGray">Your Story</h2>
            <div className="relative h-full">
              <Textarea
                className="h-64 lg:h-[500px] resize-none text-base p-4 mb-4 font-sans border-2"
                placeholder="Write or paste your life story here in Hebrew or English... Share your memories, experiences, and moments that defined your journey."
                value={story}
                onChange={(e) => setStory(e.target.value)}
                dir="auto" // Automatically detects text direction (RTL for Hebrew)
              />
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">
                  {isSaving ? "Saving..." : "Saved"}
                </span>
                <Button 
                  onClick={processWithAI}
                  disabled={isProcessing || !story.trim()}
                  className="bg-memoir-yellow hover:bg-memoir-yellow/90 text-memoir-darkGray font-medium"
                >
                  {isProcessing ? "Processing..." : "Enhance Your Story"}
                </Button>
              </div>
            </div>
          </div>

          {/* AI Output Preview */}
          <div className="flex flex-col">
            <h2 className="text-xl font-semibold mb-3 text-memoir-darkGray">Your Edited Story</h2>
            <Card className="glass-card h-64 lg:h-[500px] overflow-auto">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg text-memoir-darkGray">AI Enhanced Version</CardTitle>
              </CardHeader>
              <CardContent>
                <div dir="auto" className="whitespace-pre-line">
                  {editedStory ? (
                    editedStory
                  ) : (
                    <p className="text-gray-400 italic">
                      Your enhanced story will appear here after processing...
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

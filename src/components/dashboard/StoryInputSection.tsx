
import React from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Save } from 'lucide-react';

interface StoryInputSectionProps {
  storyInput: string;
  setStoryInput: (value: string) => void;
  lastSaved: Date | null;
  handleEnhanceStory: () => void;
  isEnhancing: boolean;
  openSaveDialog: () => void;
}

const StoryInputSection: React.FC<StoryInputSectionProps> = ({
  storyInput,
  setStoryInput,
  lastSaved,
  handleEnhanceStory,
  isEnhancing,
  openSaveDialog
}) => {
  return (
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
            onClick={openSaveDialog}
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
  );
};

export default StoryInputSection;

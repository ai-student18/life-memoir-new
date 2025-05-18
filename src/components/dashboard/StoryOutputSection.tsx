
import React from 'react';

interface StoryOutputSectionProps {
  enhancedStory: string;
}

const StoryOutputSection: React.FC<StoryOutputSectionProps> = ({
  enhancedStory
}) => {
  return (
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
  );
};

export default StoryOutputSection;

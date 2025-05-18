
import React from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

interface SaveStoryDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  storyTitle: string;
  setStoryTitle: (title: string) => void;
  handleSaveStory: () => void;
  isSaving: boolean;
}

const SaveStoryDialog: React.FC<SaveStoryDialogProps> = ({
  isOpen,
  onOpenChange,
  storyTitle,
  setStoryTitle,
  handleSaveStory,
  isSaving
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
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
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSaveStory} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SaveStoryDialog;

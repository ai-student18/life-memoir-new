
import React from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

interface AISettingsDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  systemInstruction: string;
  setSystemInstruction: (instruction: string) => void;
  saveSystemInstruction: () => void;
}

const AISettingsDialog: React.FC<AISettingsDialogProps> = ({
  isOpen,
  onOpenChange,
  systemInstruction,
  setSystemInstruction,
  saveSystemInstruction
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
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
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={saveSystemInstruction}>Save Settings</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AISettingsDialog;

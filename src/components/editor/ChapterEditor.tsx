
import { useState, useEffect } from "react";
import { Chapter } from "@/types/biography";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Save, Check, Sparkles } from "lucide-react";
import { useAutoSave } from "@/hooks/useAutoSave";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import DraftViewer from "./DraftViewer";

interface ChapterEditorProps {
  chapter: Chapter;
  onSave: (chapter: Partial<Chapter> & { id: string }) => Promise<void>;
}

const ChapterEditor = ({ chapter, onSave }: ChapterEditorProps) => {
  const [title, setTitle] = useState(chapter.title);
  const [content, setContent] = useState(chapter.content || "");
  const [editedChapter, setEditedChapter] = useState<Partial<Chapter> & { id: string }>({
    id: chapter.id,
    title: chapter.title,
    content: chapter.content || "",
  });
  const [draftDialogOpen, setDraftDialogOpen] = useState(false);

  // Update local state when chapter prop changes (e.g., when switching chapters)
  useEffect(() => {
    setTitle(chapter.title);
    setContent(chapter.content || "");
    setEditedChapter({
      id: chapter.id,
      title: chapter.title,
      content: chapter.content || "",
    });
  }, [chapter]);

  // Handle title change
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    setEditedChapter(prev => ({ ...prev, title: newTitle }));
  };

  // Handle content change
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);
    setEditedChapter(prev => ({ ...prev, content: newContent }));
  };

  // Auto-save hook
  const { isSaving, hasUnsavedChanges, forceSave, lastSavedAt } = useAutoSave({
    data: editedChapter,
    onSave: async (data) => {
      await onSave(data);
    },
    saveDelay: 3000,
  });

  // Handle updating content from draft
  const handleUpdateFromDraft = (_chapterIndex: number, draftContent: string) => {
    setContent(draftContent);
    setEditedChapter(prev => ({ ...prev, content: draftContent }));
    setDraftDialogOpen(false);
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <CardTitle>
          <Input
            value={title}
            onChange={handleTitleChange}
            className="text-xl font-bold"
            placeholder="Chapter Title"
          />
        </CardTitle>
        <div className="text-xs text-muted-foreground mt-1">
          {isSaving ? (
            <span className="text-amber-500">Saving...</span>
          ) : hasUnsavedChanges ? (
            <span className="text-amber-500">Unsaved changes</span>
          ) : lastSavedAt ? (
            <span className="text-green-600 flex items-center">
              <Check className="h-3 w-3 mr-1" />
              Saved
            </span>
          ) : null}
        </div>
      </CardHeader>
      <CardContent>
        <Textarea
          value={content}
          onChange={handleContentChange}
          className="min-h-[60vh]"
          placeholder="Start writing your chapter content here..."
        />
      </CardContent>
      <CardFooter className="flex justify-between">
        <Dialog open={draftDialogOpen} onOpenChange={setDraftDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline">
              <Sparkles className="mr-2 h-4 w-4" />
              Use AI Draft
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl h-[80vh]">
            <DialogHeader>
              <DialogTitle>Biography Draft</DialogTitle>
              <DialogDescription>
                Select content from the AI-generated draft to use in this chapter
              </DialogDescription>
            </DialogHeader>
            <div className="overflow-y-auto flex-grow">
              <DraftViewer 
                biographyId={chapter.biography_id} 
                onUpdateChapter={handleUpdateFromDraft} 
              />
            </div>
          </DialogContent>
        </Dialog>
        
        <Button
          onClick={forceSave}
          disabled={isSaving || !hasUnsavedChanges}
          className="px-4"
        >
          <Save className="mr-2 h-4 w-4" />
          {isSaving ? "Saving..." : "Save Chapter"}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ChapterEditor;

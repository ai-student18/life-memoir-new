
import { useState, useEffect } from "react";
import { Chapter } from "@/types/biography";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Save, Check, Sparkles, FileText } from "lucide-react";
import { useAutoSave } from "@/hooks/useAutoSave";
import { toast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import DraftViewer from "./DraftViewer";

interface ChapterEditorProps {
  chapter: Chapter;
  onSave: (chapter: Partial<Chapter> & { id: string }) => Promise<void>;
  onSaveSuccess?: () => void;
}

const ChapterEditor = ({ chapter, onSave, onSaveSuccess }: ChapterEditorProps) => {
  const [title, setTitle] = useState(chapter.title);
  const [content, setContent] = useState(chapter.content || "");
  const [editedChapter, setEditedChapter] = useState<Partial<Chapter> & { id: string }>({
    id: chapter.id,
    title: chapter.title,
    content: chapter.content || "",
  });
  const [draftDialogOpen, setDraftDialogOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);

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
      if (onSaveSuccess) {
        onSaveSuccess();
      }
    },
    saveDelay: 3000,
  });

  // Handle updating content from draft
  const handleUpdateFromDraft = (_chapterIndex: number, draftContent: string) => {
    setContent(draftContent);
    setEditedChapter(prev => ({ ...prev, content: draftContent }));
    setDraftDialogOpen(false);
  };

  const handleExport = (format: 'word' | 'epub') => {
    // This would be implemented as an edge function call
    console.log(`Exporting chapter in ${format} format`);
    toast({
      title: "Export Started",
      description: `Your ${format.toUpperCase()} file is being prepared. It will download automatically when ready.`,
    });
    // Close the dialog
    setExportDialogOpen(false);
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <CardTitle className="flex justify-between items-center">
          <Input
            value={title}
            onChange={handleTitleChange}
            className="text-xl font-bold"
            placeholder="Chapter Title"
          />
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setExportDialogOpen(true)}
          >
            <FileText className="h-4 w-4 mr-2" />
            Export
          </Button>
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
          className="min-h-[60vh] font-serif text-base leading-relaxed"
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
        
        <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Export Chapter</DialogTitle>
              <DialogDescription>
                Choose a format to export your chapter
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid grid-cols-2 gap-4 py-4">
              <Button 
                onClick={() => handleExport('word')} 
                className="h-28 flex flex-col"
              >
                <FileText className="h-8 w-8 mb-2" />
                <span>Word (.docx)</span>
                <span className="text-xs mt-1">Microsoft Word Document</span>
              </Button>
              <Button 
                onClick={() => handleExport('epub')} 
                className="h-28 flex flex-col"
              >
                <FileText className="h-8 w-8 mb-2" />
                <span>EPUB (.epub)</span>
                <span className="text-xs mt-1">E-book Format</span>
              </Button>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setExportDialogOpen(false)}>
                Cancel
              </Button>
            </DialogFooter>
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

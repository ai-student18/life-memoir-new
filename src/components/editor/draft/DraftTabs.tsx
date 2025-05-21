
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { isStringRecord } from "@/lib/validation";
import { FullBiographyView } from "./FullBiographyView";
import { ChapterView } from "./ChapterView";
import { toast } from "@/hooks/use-toast";
import { BiographyDraft } from "@/types/biography";

interface DraftTabsProps {
  draft: BiographyDraft;
  onUpdateChapter?: (chapterIndex: number, content: string) => void;
}

export const DraftTabs = ({ draft, onUpdateChapter }: DraftTabsProps) => {
  const [activeTab, setActiveTab] = useState("full");

  if (!draft) return null;

  // Add detailed logging for debugging
  console.log("DraftTabs rendering with draft:", {
    id: draft.id,
    biography_id: draft.biography_id,
    has_full_content: !!draft.full_content,
    full_content_length: draft.full_content?.length || 0,
    chapter_content_type: typeof draft.chapter_content,
    is_chapter_content_null: draft.chapter_content === null,
    chapter_keys: draft.chapter_content ? Object.keys(draft.chapter_content) : []
  });

  // Check if chapter_content exists and is properly formatted
  if (!draft.chapter_content || typeof draft.chapter_content !== 'object' || draft.chapter_content === null) {
    console.error("Invalid chapter content format:", draft.chapter_content);
    return (
      <Alert variant="destructive">
        <AlertTitle>Invalid chapter content format</AlertTitle>
        <AlertDescription>
          The chapter content data is missing or not in the expected format. Please try regenerating the draft.
        </AlertDescription>
      </Alert>
    );
  }

  // Ensure chapter_content is a record with string values
  if (!isStringRecord(draft.chapter_content)) {
    console.error("Chapter content is not a record with string values:", draft.chapter_content);
    return (
      <Alert variant="destructive">
        <AlertTitle>Invalid data format</AlertTitle>
        <AlertDescription>
          The chapter content data is not in the expected format. Please try regenerating the draft.
        </AlertDescription>
      </Alert>
    );
  }

  const handleUpdateFromDraft = (chapterTitle: string) => {
    if (!draft?.chapter_content || !onUpdateChapter) {
      toast({
        title: "Error",
        description: "Cannot apply draft content - editor not ready",
        variant: "destructive",
      });
      return;
    }
    
    // Ensure chapter_content is a valid object with string values
    if (!isStringRecord(draft.chapter_content)) {
      toast({
        title: "Error",
        description: "Invalid chapter content format",
        variant: "destructive",
      });
      return;
    }
    
    // Get the chapter content by title
    const chapterContent = draft.chapter_content[chapterTitle];
    if (typeof chapterContent !== 'string') {
      toast({
        title: "Error", 
        description: "Chapter content not found",
        variant: "destructive",
      });
      return;
    }
    
    // Find the index in structure or if that's not available, try to parse from title
    let chapterIndex = -1;
    const match = chapterTitle.match(/^Chapter (\d+)/i);
    if (match) {
      chapterIndex = parseInt(match[1], 10) - 1;
    }

    if (chapterIndex >= 0) {
      onUpdateChapter(chapterIndex, chapterContent);
      toast({
        title: "Success", 
        description: "Draft content applied to chapter",
      });
    } else {
      toast({
        title: "Error", 
        description: "Could not determine chapter index",
        variant: "destructive",
      });
    }
  };

  // Get chapter titles
  const chapters = Object.keys(draft.chapter_content);
  console.log(`Rendering ${chapters.length} chapters in tabs`);
  
  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="w-full overflow-x-auto">
        <TabsTrigger value="full">Full Biography</TabsTrigger>
        {chapters.map((title) => (
          <TabsTrigger key={title} value={title}>
            {title}
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value="full" className="mt-4">
        <FullBiographyView content={draft.full_content} />
      </TabsContent>

      {chapters.map((title) => {
        const chapterContent = draft.chapter_content[title];
        return (
          <TabsContent key={title} value={title} className="mt-4">
            <ChapterView 
              title={title} 
              content={chapterContent}
              onApplyToEditor={onUpdateChapter ? () => handleUpdateFromDraft(title) : undefined}
            />
          </TabsContent>
        );
      })}
    </Tabs>
  );
};

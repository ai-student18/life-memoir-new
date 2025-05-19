
import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTOC } from "@/hooks/useTOC";
import { supabase } from "@/integrations/supabase/client";
import { BiographyStatus } from "@/types/biography";
import { toast } from "@/hooks/use-toast";
import TOCHeader from "./TOCHeader";
import ChaptersList from "./ChaptersList";
import { validateTOC } from "./TOCValidation";
import { useChapterManagement } from "./useChapterManagement";

const TOCEditor = () => {
  const { biographyId } = useParams<{ biographyId: string }>();
  const navigate = useNavigate();
  const { isLoading, error, updateTOC, chapters } = useTOC(biographyId);
  const { 
    chapters: localChapters, 
    handleAddChapter, 
    handleUpdateChapter, 
    handleDeleteChapter,
    setChaptersList
  } = useChapterManagement(chapters);
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveTOC = async () => {
    if (!validateTOC(localChapters)) return;

    setIsSaving(true);
    try {
      await updateTOC.mutateAsync({ structure: localChapters });
    } finally {
      setIsSaving(false);
    }
  };

  const handleApproveAndContinue = async () => {
    if (!validateTOC(localChapters)) return;

    setIsSaving(true);
    try {
      // First update and approve the TOC
      await updateTOC.mutateAsync({
        structure: localChapters,
        approved: true,
      });

      // Then create chapter records for each TOC entry
      if (biographyId) {
        try {
          // First, check if chapters already exist to avoid duplicates
          const { data: existingChapters } = await supabase
            .from("biography_chapters")
            .select("id")
            .eq("biography_id", biographyId);

          // Only create chapters if none exist yet
          if (!existingChapters || existingChapters.length === 0) {
            // Create chapters based on the TOC structure
            const chaptersToInsert = localChapters.map((chapter, index) => ({
              biography_id: biographyId,
              title: chapter.title,
              content: chapter.description,
              chapter_order: index,
            }));

            const { error: chaptersError } = await supabase
              .from("biography_chapters")
              .insert(chaptersToInsert);

            if (chaptersError) {
              console.error("Error creating chapters:", chaptersError);
              toast({
                title: "Warning",
                description: "Table of contents approved, but there was an error creating chapters",
                variant: "destructive",
              });
            }
          }
          
          // Update biography status to TOCApproved
          await supabase
            .from("biographies")
            .update({
              status: BiographyStatus.TOCApproved,
              updated_at: new Date().toISOString()
            })
            .eq("id", biographyId);
          
        } catch (error) {
          console.error("Error managing chapters:", error);
        }
      }

      // Navigate to the editor
      navigate(`/biography/${biographyId}/editor`);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center p-8">Loading TOC...</div>;
  }

  if (error) {
    return <div className="text-red-500 p-4">Error loading table of contents</div>;
  }

  return (
    <div className="space-y-6">
      <TOCHeader
        onSave={handleSaveTOC}
        onApprove={handleApproveAndContinue}
        isSaving={isSaving}
      />
      
      <ChaptersList
        chapters={localChapters}
        onChaptersChange={setChaptersList}
        onUpdateChapter={handleUpdateChapter}
        onDeleteChapter={handleDeleteChapter}
        onAddChapter={handleAddChapter}
      />
    </div>
  );
};

export default TOCEditor;


import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface Chapter {
  id: string;
  title: string;
  content: string | null;
  biography_id: string;
  chapter_order: number;
  created_at: string;
  updated_at: string;
}

export const useChapters = (biographyId: string | undefined) => {
  const [isSaving, setIsSaving] = useState(false);
  const queryClient = useQueryClient();

  // Fetch chapters for a biography
  const {
    data: chapters,
    isLoading,
    error,
  } = useQuery<Chapter[], Error>({
    queryKey: ["biography_chapters", biographyId],
    queryFn: async () => {
      if (!biographyId) throw new Error("Biography ID is required");

      const { data, error } = await supabase
        .from("biography_chapters")
        .select("*")
        .eq("biography_id", biographyId)
        .order("chapter_order", { ascending: true });

      if (error) throw error;
      return data as Chapter[];
    },
    enabled: !!biographyId,
    retry: 1,
  });

  // Save or update a chapter
  const saveChapter = async (chapter: Partial<Chapter> & { id: string }): Promise<void> => {
    if (!biographyId) {
      toast({
        title: "Error",
        description: "Biography ID is missing",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);

    try {
      const { error } = await supabase
        .from("biography_chapters")
        .update({
          title: chapter.title,
          content: chapter.content,
          updated_at: new Date().toISOString(),
        })
        .eq("id", chapter.id);

      if (error) throw error;

      // Invalidate and refetch chapters
      queryClient.invalidateQueries({ queryKey: ["biography_chapters", biographyId] });

      toast({
        title: "Success",
        description: "Chapter saved successfully",
      });
    } catch (error) {
      console.error("Error saving chapter:", error);
      toast({
        title: "Error",
        description: "Failed to save chapter",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Create a new chapter
  const createChapter = async (chapterData: Omit<Chapter, "id" | "created_at" | "updated_at">): Promise<void> => {
    if (!biographyId) {
      toast({
        title: "Error",
        description: "Biography ID is missing",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);

    try {
      const { error } = await supabase
        .from("biography_chapters")
        .insert({
          ...chapterData,
          biography_id: biographyId,
        });

      if (error) throw error;

      // Invalidate and refetch chapters
      queryClient.invalidateQueries({ queryKey: ["biography_chapters", biographyId] });

      toast({
        title: "Success",
        description: "New chapter created",
      });
    } catch (error) {
      console.error("Error creating chapter:", error);
      toast({
        title: "Error",
        description: "Failed to create chapter",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return {
    chapters,
    isLoading,
    error,
    isSaving,
    saveChapter,
    createChapter,
  };
};

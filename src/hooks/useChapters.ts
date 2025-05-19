
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Chapter } from "@/types/biography";
import { extractErrorMessage } from "@/utils/errorHandling";

export const useChapters = (biographyId: string | undefined) => {
  const [isSaving, setIsSaving] = useState(false);
  const queryClient = useQueryClient();

  // Fetch chapters for a biography
  const {
    data: chapters,
    isLoading,
    error,
    refetch
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
    refetchOnWindowFocus: false,
  });

  // Save or update a chapter
  const saveChapterMutation = useMutation({
    mutationFn: async (chapter: Partial<Chapter> & { id: string }): Promise<Chapter> => {
      const { data, error } = await supabase
        .from("biography_chapters")
        .update({
          title: chapter.title,
          content: chapter.content,
          updated_at: new Date().toISOString(),
        })
        .eq("id", chapter.id)
        .select("*")
        .single();

      if (error) throw error;
      return data as Chapter;
    },
    onSuccess: (updatedChapter) => {
      // Update the cache with the new chapter data
      queryClient.setQueryData<Chapter[]>(
        ["biography_chapters", biographyId],
        (oldData) => {
          if (!oldData) return [updatedChapter];
          
          return oldData.map(chapter => 
            chapter.id === updatedChapter.id ? updatedChapter : chapter
          );
        }
      );
      
      toast({
        title: "Success",
        description: "Chapter saved successfully",
      });
    },
    onError: (error) => {
      const errorMessage = extractErrorMessage(error);
      toast({
        title: "Error",
        description: `Failed to save chapter: ${errorMessage}`,
        variant: "destructive",
      });
    }
  });

  // Optimized save function
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
      await saveChapterMutation.mutateAsync(chapter);
    } finally {
      setIsSaving(false);
    }
  };

  // Create a new chapter
  const createChapterMutation = useMutation({
    mutationFn: async (chapterData: Omit<Chapter, "id" | "created_at" | "updated_at">): Promise<Chapter> => {
      const { data, error } = await supabase
        .from("biography_chapters")
        .insert({
          ...chapterData,
          biography_id: biographyId,
        })
        .select("*")
        .single();

      if (error) throw error;
      return data as Chapter;
    },
    onSuccess: (newChapter) => {
      // Update cache with the new chapter
      queryClient.setQueryData<Chapter[]>(
        ["biography_chapters", biographyId],
        (oldData) => {
          if (!oldData) return [newChapter];
          return [...oldData, newChapter];
        }
      );
      
      toast({
        title: "Success",
        description: "New chapter created",
      });
    },
    onError: (error) => {
      const errorMessage = extractErrorMessage(error);
      toast({
        title: "Error",
        description: `Failed to create chapter: ${errorMessage}`,
        variant: "destructive",
      });
    }
  });

  // Create new chapter function
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
      await createChapterMutation.mutateAsync(chapterData);
    } finally {
      setIsSaving(false);
    }
  };

  // Reorder chapters
  const reorderChaptersMutation = useMutation({
    mutationFn: async (orderedIds: string[]): Promise<void> => {
      // Create an array of updates, one for each chapter
      const updates = orderedIds.map((id, index) => ({
        id, 
        chapter_order: index
      }));
      
      // Update each chapter's order
      for (const update of updates) {
        const { error } = await supabase
          .from("biography_chapters")
          .update({ chapter_order: update.chapter_order })
          .eq("id", update.id);
          
        if (error) throw error;
      }
    },
    onSuccess: () => {
      // Invalidate and refetch to get the updated order
      queryClient.invalidateQueries({ queryKey: ["biography_chapters", biographyId] });
      
      toast({
        title: "Success",
        description: "Chapter order updated",
      });
    },
    onError: (error) => {
      const errorMessage = extractErrorMessage(error);
      toast({
        title: "Error",
        description: `Failed to update chapter order: ${errorMessage}`,
        variant: "destructive",
      });
    }
  });

  const reorderChapters = async (orderedIds: string[]): Promise<void> => {
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
      await reorderChaptersMutation.mutateAsync(orderedIds);
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
    reorderChapters,
    refetch
  };
};


import { useChapterQueries } from "./chapters/useChapterQueries";
import { useChapterActions } from "./chapters/useChapterActions";
import { Chapter } from "@/types/biography";

/**
 * Main hook for chapter management that combines queries and actions
 */
export const useChapters = (biographyId: string | undefined) => {
  const { chapters, isLoading, error, refetch } = useChapterQueries(biographyId);
  const { isSaving, saveChapter, createChapter, reorderChapters } = useChapterActions(biographyId);

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

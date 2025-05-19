
import { useTOCQueries } from "./toc/useTOCQueries";
import { useTOCActions } from "./toc/useTOCActions";
import { TOCChapter, TOCData } from "@/types/biography";

/**
 * Main hook that combines TOC queries and actions
 */
export const useTOC = (biographyId: string | undefined) => {
  const { tocData, isLoading, error, chapters } = useTOCQueries(biographyId);
  const { isSaving, saveTOC, approveAndContinue } = useTOCActions(biographyId);

  // Update and retain the same interface as before for backward compatibility
  const updateTOC = {
    mutateAsync: async ({
      structure,
      approved,
    }: {
      structure?: TOCChapter[];
      approved?: boolean;
    }) => {
      if (approved && structure) {
        return approveAndContinue(structure);
      } else if (structure) {
        return saveTOC(structure);
      }
      return Promise.resolve();
    }
  };

  return {
    tocData,
    isLoading,
    error,
    updateTOC,
    isSaving,
    chapters,
  };
};

// Re-export the TOC types for backward compatibility
export interface TOCChapter {
  title: string;
  description: string;
}

export interface TOCData {
  id: string;
  biography_id: string;
  structure: TOCChapter[];
  approved: boolean;
  created_at: string;
  updated_at: string;
}


import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import type { Json } from "@/integrations/supabase/types";

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

/**
 * Custom hook to fetch and manage TOC data
 * @param biographyId The biography ID
 */
export const useTOC = (biographyId: string | undefined) => {
  const queryClient = useQueryClient();

  // Fetch TOC data
  const {
    data: tocData,
    isLoading,
    error,
  } = useQuery<TOCData, Error>({
    queryKey: ["biography_toc", biographyId],
    queryFn: async () => {
      if (!biographyId) throw new Error("Biography ID is required");

      const { data, error } = await supabase
        .from("biography_toc")
        .select("*")
        .eq("biography_id", biographyId)
        .single();

      if (error) throw error;
      
      // Convert Json structure to TOCChapter[]
      return {
        ...data,
        structure: (data.structure as unknown as TOCChapter[]) || []
      } as TOCData;
    },
    enabled: !!biographyId,
    retry: 1,
  });

  // Update TOC structure and approval status
  const updateTOC = useMutation({
    mutationFn: async ({
      structure,
      approved,
    }: {
      structure?: TOCChapter[];
      approved?: boolean;
    }) => {
      if (!biographyId) throw new Error("Biography ID is required");

      const updates: any = { updated_at: new Date().toISOString() };
      if (structure !== undefined) updates.structure = structure;
      if (approved !== undefined) updates.approved = approved;

      const { error } = await supabase
        .from("biography_toc")
        .update(updates)
        .eq("biography_id", biographyId)
        .select()
        .single();

      if (error) throw error;

      if (approved) {
        // Update biography progress if approving TOC
        await supabase
          .from("biographies")
          .update({
            progress: "chapters",
            updated_at: new Date().toISOString(),
          })
          .eq("id", biographyId);
      }

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["biography_toc", biographyId] });
      queryClient.invalidateQueries({ queryKey: ["biographies"] });
      toast({
        title: "Success",
        description: "Table of contents updated successfully",
      });
    },
    onError: (error) => {
      console.error("Error updating TOC:", error);
      toast({
        title: "Error",
        description: "Failed to update table of contents",
        variant: "destructive",
      });
    },
  });

  return {
    tocData,
    isLoading,
    error,
    updateTOC,
    chapters: tocData?.structure || [],
  };
};

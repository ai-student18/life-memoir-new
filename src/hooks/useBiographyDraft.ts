
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useState } from "react";
import { transformDraftData } from "@/lib/validation";
import { BiographyDraft } from "@/types/biography";

/**
 * Hook for managing biography draft generation and retrieval
 */
export const useBiographyDraft = (biographyId?: string) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const queryClient = useQueryClient();

  // Query to get draft info
  const draftQuery = useQuery({
    queryKey: ["biography-draft", biographyId],
    queryFn: async () => {
      if (!biographyId) throw new Error("Biography ID is required");

      console.log("Fetching drafts for biography:", biographyId);
      const { data, error } = await supabase
        .from("biography_drafts")
        .select("*")
        .eq("biography_id", biographyId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("Error fetching draft:", error);
        throw error;
      }
      
      console.log("Raw draft data from DB:", data);
      
      // Validate and transform the data
      const validatedData = transformDraftData(data);
      
      if (!validatedData) {
        console.error("Invalid draft data received:", data);
        throw new Error("Invalid draft data received from server");
      }
      
      console.log("Validated draft data:", validatedData);
      return validatedData;
    },
    enabled: !!biographyId,
    retry: 1,
  });

  // Mutation to generate a new draft
  const generateDraftMutation = useMutation({
    mutationFn: async (id: string) => {
      setIsGenerating(true);
      try {
        console.log("Calling draft generation function for biography:", id);
        
        // Add request payload logging
        const requestPayload = { biographyId: id };
        console.log("Request payload:", requestPayload);
        
        const { data, error } = await supabase.functions.invoke("generate-biography-draft", {
          body: requestPayload
        });

        if (error) {
          console.error("Edge function error:", error);
          throw error;
        }
        
        console.log("Response from draft generation:", data);
        
        // Let's wait for a moment to ensure the draft is saved in the database
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        return data;
      } finally {
        setIsGenerating(false);
      }
    },
    onSuccess: () => {
      toast({
        title: "Draft Generated",
        description: "Your biography draft was generated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["biography-draft", biographyId] });
      queryClient.invalidateQueries({ queryKey: ["biography", biographyId] });
    },
    onError: (error: any) => {
      console.error("Draft generation error:", error);
      toast({
        title: "Error",
        description: `Failed to generate draft: ${error?.message || "Unknown error"}`,
        variant: "destructive",
      });
    },
  });

  // Function to generate a new draft
  const generateDraft = async () => {
    if (!biographyId) {
      toast({
        title: "Error",
        description: "Biography ID is required",
        variant: "destructive",
      });
      return;
    }

    return generateDraftMutation.mutateAsync(biographyId);
  };

  const refetchDraft = () => queryClient.invalidateQueries({ queryKey: ["biography-draft", biographyId] });

  return {
    draft: draftQuery.data,
    isLoading: draftQuery.isLoading,
    error: draftQuery.error,
    generateDraft,
    isGenerating,
    refetchDraft
  };
};

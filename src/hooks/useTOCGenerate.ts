
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

/**
 * Custom hook to generate TOC for a biography
 * @returns Object containing generate function and loading state
 */
export const useTOCGenerate = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const navigate = useNavigate();

  const generateTOC = async (biographyId: string): Promise<void> => {
    if (!biographyId) {
      toast({
        title: "Error",
        description: "Biography ID is required",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No session found");

      // Check if there are any answers for this biography
      const { data: answers, error: answersError } = await supabase
        .from("biography_answers")
        .select("id")
        .eq("biography_id", biographyId)
        .limit(1);
        
      if (answersError) throw answersError;
      
      if (!answers || answers.length === 0) {
        toast({
          title: "Error",
          description: "No answers found for this biography. Please complete the questionnaire first.",
          variant: "destructive"
        });
        setIsGenerating(false);
        return;
      }

      // Generate the TOC using the edge function
      const { error } = await supabase.functions.invoke("generate-toc", {
        body: { biographyId }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Table of contents generated successfully",
      });

      // Force reload the page to get the latest TOC data
      window.location.reload();

    } catch (error) {
      console.error("Error generating TOC:", error);
      toast({
        title: "Error",
        description: "Failed to generate table of contents",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return { generateTOC, isGenerating };
};

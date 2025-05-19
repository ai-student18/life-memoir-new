
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";

/**
 * Custom hook to handle biography completion logic
 * @returns Object containing complete biography function and loading state
 */
export const useCompleteBiography = () => {
  const navigate = useNavigate();
  const [isCompleting, setIsCompleting] = useState(false);

  /**
   * Updates the biography status to indicate questionnaire completion
   * @param biographyId The ID of the biography to complete
   * @param generateToc Whether to generate TOC immediately after completion
   */
  const completeBiography = async (biographyId: string, generateToc: boolean = true): Promise<void> => {
    if (!biographyId) {
      toast({
        title: "Error",
        description: "Biography ID is required",
        variant: "destructive"
      });
      return;
    }
    
    setIsCompleting(true);
    
    try {
      // Update biography status to indicate questionnaire completion
      const { error } = await supabase
        .from("biographies")
        .update({ 
          status: "QuestionnaireCompleted", 
          updated_at: new Date().toISOString() 
        })
        .eq("id", biographyId);
        
      if (error) {
        throw error;
      }
      
      // Show success message
      toast({
        title: "Success",
        description: "Questionnaire completed successfully!",
      });
      
      // Generate TOC or navigate to dashboard
      if (generateToc) {
        try {
          const { error } = await supabase.functions.invoke("generate-toc", {
            body: { biographyId }
          });
          
          if (error) throw error;
          
          // Navigate to TOC page after successful generation
          navigate(`/biography/${biographyId}/toc`);
        } catch (error) {
          console.error("Error generating TOC:", error);
          toast({
            title: "Error",
            description: "Failed to generate table of contents, you can try again from the dashboard",
            variant: "destructive"
          });
          navigate(`/dashboard`);
        }
      } else {
        // Navigate to dashboard if not generating TOC
        navigate(`/dashboard`);
      }
      
    } catch (error) {
      console.error("Error updating biography status:", error);
      toast({
        title: "Error",
        description: "Failed to update biography status",
        variant: "destructive"
      });
    } finally {
      setIsCompleting(false);
    }
  };

  return { completeBiography, isCompleting };
};

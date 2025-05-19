
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { retry } from "@/utils/errorHandler";

/**
 * Hook to check if the Gemini API key is configured
 */
export const useGeminiApiKey = () => {
  const [isKeyConfigured, setIsKeyConfigured] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkApiKey = async () => {
      try {
        console.log("Checking Gemini API key configuration...");
        
        // Use retry logic for better reliability
        const { data, error } = await retry(
          () => supabase.functions.invoke("check-gemini-key", {
            body: {}
          }),
          {
            retries: 2,
            delay: 1000,
            onRetry: (attempt) => {
              console.log(`Retry attempt ${attempt} for check-gemini-key`);
            }
          }
        );
        
        if (error) {
          console.error("Error checking Gemini API key:", error);
          setError(error.message || "Error checking Gemini API key");
          setIsKeyConfigured(false);
        } else if (!data) {
          console.error("No data returned from check-gemini-key function");
          setError("No response from API key check");
          setIsKeyConfigured(false);
        } else {
          console.log("Gemini API key check result:", data);
          setIsKeyConfigured(data?.isConfigured === true);
          
          if (data?.isConfigured !== true) {
            setError(data?.message || "API key is not configured correctly");
          } else {
            setError(null);
          }
        }
      } catch (error) {
        console.error("Exception checking Gemini API key:", error);
        setIsKeyConfigured(false);
        setError(error instanceof Error ? error.message : "Unknown error checking API key");
        
        toast({
          title: "שגיאה בבדיקת מפתח API",
          description: "לא ניתן לבדוק האם מפתח ה-API של Gemini מוגדר במערכת",
          variant: "destructive"
        });
      } finally {
        setIsChecking(false);
      }
    };
    
    checkApiKey();
  }, []);

  return { isKeyConfigured, isChecking, error };
};

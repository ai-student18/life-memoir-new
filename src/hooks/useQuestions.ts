import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Question } from "@/types/questionnaire";
import { safeAsync } from "@/utils/errorHandler";
import { PostgrestError } from "@supabase/supabase-js";

export const useQuestions = () => {
  return useQuery<Question[], PostgrestError | Error, Question[], ["biography_questions"]>({
    queryKey: ["biography_questions"],
    queryFn: async () => {
      const [data, error] = await safeAsync(
        supabase
          .from("biography_questions")
          .select("*")
          .order("question_order", { ascending: true })
          .then(({ data, error }) => {
            if (error) throw error;
            return data as Question[];
          })
      );
      if (error) throw error; // Let React Query handle the error
      return data || [];
    },
    onError: (error) => {
      // safeAsync will show a toast by default.
      // This callback is for any additional specific error handling if needed.
      console.error("Error fetching questions:", error);
      // Optionally, show a more specific toast if safeAsync's default isn't enough
      // showErrorToast(error, "Failed to load questions"); 
    }
  });
};

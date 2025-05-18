import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { Answer as AnswerPayload, FetchedAnswer, Question } from "@/types/questionnaire";
import { handleApiError, showErrorToast, showSuccessToast } from "@/utils/errorHandling";
import { safeAsync } from "@/utils/errorHandler";
import { PostgrestError } from "@supabase/supabase-js";

export const useQuestionnaireAnswers = (biographyId: string | undefined) => {
  const [answers, setAnswers] = useState<Record<string, AnswerPayload>>({});
  const queryClient = useQueryClient();

  // Fetch existing answers for this biography
  const { 
    data: existingAnswers, 
    isLoading, 
    error: queryError 
  } = useQuery<FetchedAnswer[], PostgrestError | Error, FetchedAnswer[], readonly ["biography_answers", string | undefined]>({
    queryKey: ["biography_answers", biographyId],
    queryFn: async () => {
      if (!biographyId) throw new Error("אין מזהה ביוגרפיה");

      const [data, error] = await safeAsync(
        supabase
          .from("biography_answers")
          .select("*")
          .eq("biography_id", biographyId)
          .then(({ data, error }) => {
            if (error) throw error;
            return data as FetchedAnswer[];
          })
      );

      if (error) {
        throw error;
      }
      return data || [];
    },
    enabled: !!biographyId,
    retry: 2,
    refetchOnWindowFocus: false,
    onSuccess: (data) => {
      const answersMap = data.reduce((acc, answer) => {
        acc[answer.question_id] = answer as AnswerPayload;
        return acc;
      }, {} as Record<string, AnswerPayload>);
      setAnswers(answersMap);
    },
    onError: (error) => {
      showErrorToast(error, "שגיאה בטעינת התשובות");
    }
  });

  // Update an answer
  const saveAnswerMutation = useMutation<FetchedAnswer, PostgrestError | Error, AnswerPayload>(
    async (answer: AnswerPayload) => {
      const [data, error] = await safeAsync(
        supabase
          .from("biography_answers")
          .upsert({ ...answer } as TablesInsert<'biography_answers'>, { onConflict: "biography_id,question_id" })
          .select()
          .single()
          .then(({ data, error }) => {
            if (error) throw error;
            if (!data) throw new Error("Failed to save answer, no data returned.");
            return data as FetchedAnswer;
          })
      );

      if (error) {
        throw error;
      }
      return data;
    },
    {
      onSuccess: (data) => {
        setAnswers((prev) => ({
          ...prev,
          [data.question_id]: data as AnswerPayload,
        }));
        queryClient.invalidateQueries({ queryKey: ["biography_answers", biographyId] });
        showSuccessToast("התשובה נשמרה בהצלחה");
      },
      onError: (error) => {
        const errorMessage = handleApiError(error); 
        console.error("Error saving answer:", errorMessage);
      },
    }
  );

  // Process existing answers into a map for easy access (already handled by query onSuccess)
  // useEffect(() => {
  //   if (existingAnswers) {
  //     const answersMap = existingAnswers.reduce((acc, answer) => {
  //       acc[answer.question_id] = answer;
  //       return acc;
  //     }, {} as Record<string, AnswerPayload>);
  //     setAnswers(answersMap);
  //   }
  // }, [existingAnswers]);

  // Count answered questions
  const answeredCount = existingAnswers?.filter(a => a.answer_text?.trim())?.length || 0;

  return {
    answers,
    answeredCount,
    isLoading,
    error: queryError,
    saveAnswer: async (answer: AnswerPayload) => saveAnswerMutation.mutateAsync(answer),
    isSaving: saveAnswerMutation.isLoading,
  };
};

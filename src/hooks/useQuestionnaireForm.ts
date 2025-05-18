
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Question, Answer } from "@/types/questionnaire";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface UseQuestionnaireFormProps {
  questions: Question[];
  biographyId: string;
  answers: Record<string, Answer>;
  onSaveAnswer: (answer: Answer) => Promise<void>;
  onComplete: () => void;
}

export const useQuestionnaireForm = ({
  questions,
  biographyId,
  answers,
  onSaveAnswer,
  onComplete
}: UseQuestionnaireFormProps) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const navigate = useNavigate();
  
  const form = useForm({
    defaultValues: {
      answer: "",
    },
  });

  const currentQuestion = questions[currentQuestionIndex];

  // Update form values when current question or answers change
  useEffect(() => {
    if (currentQuestion && answers[currentQuestion.id]) {
      form.reset({
        answer: answers[currentQuestion.id]?.answer_text || "",
      });
    } else if (currentQuestion) {
      form.reset({
        answer: "",
      });
    }
  }, [currentQuestion, answers, form]);

  const handleSaveAnswer = async (data: { answer: string }) => {
    if (!currentQuestion) return;
    
    setIsSaving(true);
    
    try {
      const answer: Answer = {
        biography_id: biographyId,
        question_id: currentQuestion.id,
        answer_text: data.answer,
      };
      
      await onSaveAnswer(answer);
      toast.success("תשובה נשמרה בהצלחה");
    } catch (error) {
      console.error("Error saving answer:", error);
      toast.error("שגיאה בשמירת התשובה");
    } finally {
      setIsSaving(false);
    }
  };

  const handleNext = async () => {
    await form.handleSubmit(handleSaveAnswer)();
    
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      // We're at the last question
      onComplete();
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleSaveAndExit = async () => {
    await form.handleSubmit(handleSaveAnswer)();
    navigate(`/dashboard`);
  };

  return {
    form,
    currentQuestion,
    currentQuestionIndex,
    isSaving,
    handleSaveAnswer,
    handleNext,
    handlePrevious,
    handleSaveAndExit,
  };
};

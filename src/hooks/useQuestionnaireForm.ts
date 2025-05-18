import { useState, useEffect } from "react";
import { useForm, FieldValues, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Question, Answer } from "@/types/questionnaire";
import { useNavigate } from "react-router-dom";
import { biographyAnswerSchema } from "@/utils/formValidation";
import { showErrorToast } from "@/utils/errorHandling";
import { safeAsync } from "@/utils/errorHandler";

interface QuestionnaireFormData {
  answer: string;
}

interface UseQuestionnaireFormProps {
  questions: Question[];
  biographyId: string;
  answers: Record<string, Answer>;
  onSaveAnswer: (answer: Answer) => Promise<unknown>;
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  
  const form = useForm<QuestionnaireFormData>({
    defaultValues: {
      answer: "",
    },
    resolver: zodResolver(biographyAnswerSchema),
  });

  const currentQuestion = questions[currentQuestionIndex];

  useEffect(() => {
    if (currentQuestion) {
      form.reset({
        answer: answers[currentQuestion.id]?.answer_text || "",
      });
    }
  }, [currentQuestion, answers, form]);

  const processSaveAnswer: SubmitHandler<QuestionnaireFormData> = async (data) => {
    if (!currentQuestion) return;
    
    setIsSubmitting(true);
    
    const answerToSave: Answer = {
      biography_id: biographyId,
      question_id: currentQuestion.id,
      answer_text: data.answer,
    };
    
    try {
      await onSaveAnswer(answerToSave);
    } catch (error) {
      console.error("Error during onSaveAnswer call from useQuestionnaireForm:", error);
      showErrorToast(error, "שגיאה בתהליך שמירת התשובה");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNext = async () => {
    const isValid = await form.trigger();
    if (!isValid) return;

    const [, error] = await safeAsync(form.handleSubmit(processSaveAnswer)(), {
      showToast: false,
    });

    if (!error) {
      if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
      } else {
        onComplete();
      }
    } else {
      showErrorToast(error, "שגיאה במעבר לשאלה הבאה");
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleSaveAndExit = async () => {
    const isValid = await form.trigger();
    if (!isValid) return;

    const [, error] = await safeAsync(form.handleSubmit(processSaveAnswer)(), {
      showToast: false,
    });

    if (!error) {
      navigate(`/dashboard`);
    } else {
      showErrorToast(error, "שגיאה בשמירה ויציאה");
    }
  };
  
  const jumpToQuestion = async (index: number) => {
    if (index >= 0 && index < questions.length) {
      const isValid = await form.trigger();
      if (!isValid && index > currentQuestionIndex) return;

      const [, error] = await safeAsync(form.handleSubmit(processSaveAnswer)(), {
        showToast: false,
      });

      if (!error) {
        setCurrentQuestionIndex(index);
      } else {
        showErrorToast(error, "שגיאה במעבר לשאלה");
      }
    }
  };

  return {
    form,
    currentQuestion,
    currentQuestionIndex,
    isSubmitting,
    processSaveAnswer,
    handleNext,
    handlePrevious,
    handleSaveAndExit,
    jumpToQuestion,
    totalQuestions: questions.length,
  };
};


import { useParams } from "react-router-dom";
import NavBar from "@/components/NavBar";
import QuestionnaireForm from "@/components/questionnaire/QuestionnaireForm";
import QuestionnaireProgress from "@/components/questionnaire/QuestionnaireProgress";
import QuestionnaireLoading from "@/components/questionnaire/QuestionnaireLoading";
import QuestionnaireNotFound from "@/components/questionnaire/QuestionnaireNotFound";
import QuestionnaireHeader from "@/components/questionnaire/QuestionnaireHeader";
import { useBiography } from "@/hooks/useBiography";
import { useQuestions } from "@/hooks/useQuestions";
import { useQuestionnaireAnswers } from "@/hooks/useQuestionnaireAnswers";
import { useCompleteBiography } from "@/hooks/useCompleteBiography";
import { Answer } from "@/types/questionnaire";

const BiographyQuestionnaire = () => {
  const { biographyId } = useParams<{ biographyId: string }>();
  
  // Custom hooks to fetch and manage data
  const { data: biography, isLoading: biographyLoading } = useBiography(biographyId);
  const { data: questions, isLoading: questionsLoading } = useQuestions();
  const { answers, answeredCount, isLoading: answersLoading, saveAnswer } = useQuestionnaireAnswers(biographyId);
  const { completeBiography } = useCompleteBiography();

  // Check if data is still loading
  const isLoading = biographyLoading || questionsLoading || answersLoading;
  
  // Show loading state while data is being fetched
  if (isLoading) {
    return <QuestionnaireLoading />;
  }

  // Show error state if biography is not found
  if (!biography) {
    return <QuestionnaireNotFound />;
  }

  // Function to handle saving an answer
  const handleSaveAnswer = async (answer: Answer) => {
    await saveAnswer(answer);
  };

  // Function to handle completing the questionnaire
  const handleComplete = async () => {
    if (biographyId) {
      await completeBiography(biographyId);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <NavBar />
      
      <div className="container mx-auto px-4 py-8 pt-24">
        <QuestionnaireHeader title={biography.title} />
        
        {questions && questions.length > 0 && (
          <>
            <QuestionnaireProgress 
              questions={questions} 
              answeredCount={answeredCount} 
            />
            
            <QuestionnaireForm
              questions={questions}
              biographyId={biographyId || ''}
              answers={answers}
              onSaveAnswer={handleSaveAnswer}
              onComplete={handleComplete}
            />
          </>
        )}
      </div>
    </div>
  );
};

export default BiographyQuestionnaire;

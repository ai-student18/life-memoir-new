
import { useParams, useNavigate } from "react-router-dom";
import NavBar from "@/components/NavBar";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight } from "lucide-react";
import DraftViewer from "@/components/editor/DraftViewer";
import { useBiography } from "@/hooks/useBiography";
import { ErrorDisplay } from "@/components/ui/error-display";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

const BiographyDraft = () => {
  const { biographyId } = useParams<{ biographyId: string }>();
  const navigate = useNavigate();
  const { data: biography, isLoading, error } = useBiography(biographyId);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !biography) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white p-4">
        <ErrorDisplay 
          title="Failed to load biography" 
          message="Unable to load biography details. Please try again." 
          onRetry={() => window.location.reload()}
          variant="full"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <NavBar />
      
      <div className="container mx-auto px-4 py-8 pt-24">
        <div className="flex flex-col space-y-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <Button 
              variant="outline" 
              onClick={() => navigate(`/biography/${biographyId}/toc`)}
              className="flex items-center"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to TOC
            </Button>
            
            <Button 
              onClick={() => navigate(`/biography/${biographyId}/editor`)}
              className="flex items-center bg-memoir-yellow text-memoir-darkGray hover:bg-memoir-yellow/90"
            >
              Go to Editor
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
          
          <h1 className="text-3xl font-bold">{biography.title} - Draft</h1>
          <p className="text-gray-600 mb-4">
            Review the AI-generated draft of your biography based on your questionnaire answers
          </p>
        </div>
        
        <DraftViewer biographyId={biographyId} />
      </div>
    </div>
  );
};

export default BiographyDraft;

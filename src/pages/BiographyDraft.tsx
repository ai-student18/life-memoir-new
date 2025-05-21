
import { useParams, useNavigate } from "react-router-dom";
import NavBar from "@/components/NavBar";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, FileText } from "lucide-react";
import DraftViewer from "@/components/editor/DraftViewer";
import { useBiography } from "@/hooks/useBiography";
import { ErrorDisplay } from "@/components/ui/error-display";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";

const BiographyDraft = () => {
  const { biographyId } = useParams<{ biographyId: string }>();
  const navigate = useNavigate();
  const { data: biography, isLoading, error } = useBiography(biographyId);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);

  const handleExport = (format: 'word' | 'epub') => {
    // This would call an Edge Function to generate the document
    toast({
      title: "Export Started",
      description: `Your ${format.toUpperCase()} file is being prepared. It will download automatically when ready.`,
    });
    setExportDialogOpen(false);
  };

  // Ensure biographyId is defined before using it
  if (!biographyId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white p-4">
        <ErrorDisplay 
          title="Missing biography ID" 
          message="No biography ID provided." 
          onRetry={() => navigate('/dashboard')}
          variant="full"
        />
      </div>
    );
  }

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
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                onClick={() => navigate(`/biography/${biographyId}/toc`)}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to TOC
              </Button>
              
              <Button 
                variant="outline" 
                onClick={() => navigate('/dashboard')}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Dashboard
              </Button>
            </div>
            
            <div className="flex space-x-2">
              <Button 
                variant="outline"
                onClick={() => navigate(`/biography/${biographyId}/questionnaire`)}
              >
                Edit Questionnaire
              </Button>
              
              <Button
                variant="outline"
                onClick={() => setExportDialogOpen(true)}
              >
                <FileText className="h-4 w-4 mr-2" />
                Export
              </Button>
              
              <Button 
                onClick={() => navigate(`/biography/${biographyId}/editor`)}
                className="flex items-center bg-memoir-yellow text-memoir-darkGray hover:bg-memoir-yellow/90"
              >
                Go to Editor
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
          
          <h1 className="text-3xl font-bold">{biography.title} - Draft</h1>
          <p className="text-gray-600 mb-4">
            Review the AI-generated draft of your biography based on your questionnaire answers
          </p>
        </div>
        
        <DraftViewer biographyId={biographyId} />
        
        <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Export Biography</DialogTitle>
              <DialogDescription>
                Choose a format to export your complete biography
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid grid-cols-2 gap-4 py-4">
              <Button 
                onClick={() => handleExport('word')} 
                className="h-28 flex flex-col"
              >
                <FileText className="h-8 w-8 mb-2" />
                <span>Word (.docx)</span>
                <span className="text-xs mt-1">Microsoft Word Document</span>
              </Button>
              <Button 
                onClick={() => handleExport('epub')} 
                className="h-28 flex flex-col"
              >
                <FileText className="h-8 w-8 mb-2" />
                <span>EPUB (.epub)</span>
                <span className="text-xs mt-1">E-book Format</span>
              </Button>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setExportDialogOpen(false)}>
                Cancel
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default BiographyDraft;

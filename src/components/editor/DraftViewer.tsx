
import { useState } from "react";
import { isStringRecord } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { FileText, Save, RefreshCw } from "lucide-react";
import { useBiographyDraft } from "@/hooks/useBiographyDraft";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "@/hooks/use-toast";

interface DraftViewerProps {
  biographyId: string;
  onUpdateChapter?: (chapterIndex: number, content: string) => void;
}

const DraftViewer = ({ biographyId, onUpdateChapter }: DraftViewerProps) => {
  const [activeTab, setActiveTab] = useState("full");
  const { draft, isLoading, error, generateDraft, isGenerating, refetchDraft } = useBiographyDraft(biographyId);

  const handleUpdateFromDraft = (chapterTitle: string) => {
    if (!draft?.chapter_content || !onUpdateChapter) {
      toast({
        title: "Error",
        description: "Cannot apply draft content - editor not ready",
        variant: "destructive",
      });
      return;
    }
    
    // Ensure chapter_content is a valid object with string values
    if (!isStringRecord(draft.chapter_content)) {
      toast({
        title: "Error",
        description: "Invalid chapter content format",
        variant: "destructive",
      });
      return;
    }
    
    // Get the chapter content by title
    const chapterContent = draft.chapter_content[chapterTitle];
    if (typeof chapterContent !== 'string') {
      toast({
        title: "Error", 
        description: "Chapter content not found",
        variant: "destructive",
      });
      return;
    }
    
    // Find the index in structure or if that's not available, try to parse from title
    let chapterIndex = -1;
    const match = chapterTitle.match(/^Chapter (\d+)/i);
    if (match) {
      chapterIndex = parseInt(match[1], 10) - 1;
    }

    if (chapterIndex >= 0) {
      onUpdateChapter(chapterIndex, chapterContent);
      toast({
        title: "Success", 
        description: "Draft content applied to chapter",
      });
    } else {
      toast({
        title: "Error", 
        description: "Could not determine chapter index",
        variant: "destructive",
      });
    }
  };

  const handleExport = () => {
    // This would be implemented with an Edge Function
    toast({
      title: "Export Started",
      description: "Your complete biography draft is being prepared for download.",
    });
  };

  const renderChapterTabs = () => {
    if (!draft) return null;

    // Ensure chapter_content is a record with string values
    if (!isStringRecord(draft.chapter_content)) {
      return (
        <Alert variant="destructive">
          <AlertTitle>Invalid data format</AlertTitle>
          <AlertDescription>
            The chapter content data is not in the expected format.
          </AlertDescription>
        </Alert>
      );
    }

    const chapters = Object.keys(draft.chapter_content);
    return (
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full overflow-x-auto">
          <TabsTrigger value="full">Full Biography</TabsTrigger>
          {chapters.map((title) => (
            <TabsTrigger key={title} value={title}>
              {title}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="full" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                <span>Full Biography Draft</span>
                <Button onClick={handleExport} variant="outline" size="sm">
                  <FileText className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="prose max-w-none">
              <div className="whitespace-pre-wrap">{draft.full_content}</div>
            </CardContent>
          </Card>
        </TabsContent>

        {chapters.map((title) => {
          const chapterContent = draft.chapter_content[title];
          return (
            <TabsContent key={title} value={title} className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex justify-between items-center">
                    <span>{title}</span>
                    {onUpdateChapter && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleUpdateFromDraft(title)}
                      >
                        <Save className="h-4 w-4 mr-2" />
                        Use in Editor
                      </Button>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="prose max-w-none">
                  <div className="whitespace-pre-wrap">
                    {chapterContent}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          );
        })}
      </Tabs>
    );
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Error loading draft</AlertTitle>
        <AlertDescription>
          {error instanceof Error ? error.message : "Failed to load draft"}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Biography Draft</h2>
        <Button
          onClick={() => generateDraft()}
          disabled={isGenerating}
          className="bg-memoir-yellow text-memoir-darkGray hover:bg-memoir-yellow/90"
        >
          {isGenerating ? (
            <>
              <LoadingSpinner className="mr-2 h-4 w-4" />
              Generating...
            </>
          ) : draft ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Regenerate Draft
            </>
          ) : (
            <>
              <FileText className="mr-2 h-4 w-4" />
              Generate Draft
            </>
          )}
        </Button>
      </div>

      {isGenerating && (
        <Alert>
          <AlertTitle>Generating Draft</AlertTitle>
          <AlertDescription>
            We're generating your biography draft. This may take a few moments...
          </AlertDescription>
        </Alert>
      )}

      {draft ? (
        renderChapterTabs()
      ) : !isGenerating ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-gray-500 mb-4">
              No draft has been generated yet. Click the "Generate Draft" button to create a complete draft of your biography.
            </p>
            <p className="text-sm text-gray-400">
              This will use your questionnaire answers and approved table of contents to create a comprehensive draft.
            </p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
};

export default DraftViewer;

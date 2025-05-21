
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useBiographyDraft } from "@/hooks/useBiographyDraft";
import { 
  DraftControls, 
  DraftTabs, 
  EmptyDraftCard, 
  GeneratingAlert 
} from "./draft";

interface DraftViewerProps {
  biographyId: string;
  onUpdateChapter?: (chapterIndex: number, content: string) => void;
}

const DraftViewer = ({ biographyId, onUpdateChapter }: DraftViewerProps) => {
  const { 
    draft, 
    isLoading, 
    error, 
    generateDraft, 
    isGenerating,
    refetchDraft 
  } = useBiographyDraft(biographyId);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    console.error("Draft loading error:", error);
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
      <DraftControls 
        draft={draft}
        isGenerating={isGenerating}
        generateDraft={generateDraft}
        refetchDraft={refetchDraft}
      />

      {isGenerating && <GeneratingAlert />}

      {draft ? (
        <DraftTabs draft={draft} onUpdateChapter={onUpdateChapter} />
      ) : !isGenerating ? (
        <EmptyDraftCard />
      ) : null}
    </div>
  );
};

export default DraftViewer;

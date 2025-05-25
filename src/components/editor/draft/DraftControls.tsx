
import { Button } from "@/components/ui/button";
import { FileText, RefreshCw } from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { toast } from "@/hooks/use-toast";

interface DraftControlsProps {
  draft: any | null;
  isGenerating: boolean;
  generateDraft: () => void;
  refetchDraft: () => void;
}

export const DraftControls = ({
  draft,
  isGenerating,
  generateDraft,
  refetchDraft,
}: DraftControlsProps) => {
  const handleRefresh = () => {
    refetchDraft();
    toast({
      title: "Refreshing",
      description: "Refreshing draft content from the database."
    });
  };

  return (
    <div className="flex justify-between items-center">
      <h2 className="text-2xl font-bold">Biography Draft</h2>
      <div className="flex space-x-2">
        <Button
          onClick={handleRefresh}
          variant="outline"
          disabled={isGenerating}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
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
    </div>
  );
};

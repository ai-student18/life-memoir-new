
import { Button } from "@/components/ui/button";
import { Save, ArrowRight } from "lucide-react";

interface TOCHeaderProps {
  onSave: () => Promise<void>;
  onApprove: () => Promise<void>;
  isSaving: boolean;
}

const TOCHeader = ({ onSave, onApprove, isSaving }: TOCHeaderProps) => {
  return (
    <div className="flex justify-between items-center mb-6">
      <div>
        <h2 className="text-2xl font-bold">Table of Contents</h2>
        <p className="text-muted-foreground">
          Review and edit the suggested chapters for your biography
        </p>
      </div>

      <div className="flex space-x-2">
        <Button
          variant="outline"
          onClick={onSave}
          disabled={isSaving}
        >
          <Save className="mr-2 h-4 w-4" />
          Save
        </Button>
        <Button
          onClick={onApprove}
          disabled={isSaving}
        >
          Approve & Continue
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default TOCHeader;

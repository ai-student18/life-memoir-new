
import { Button } from "@/components/ui/button";
import { Save } from "lucide-react";

interface SaveExitButtonProps {
  onSaveAndExit: () => void;
}

const SaveExitButton = ({ onSaveAndExit }: SaveExitButtonProps) => {
  return (
    <Button variant="outline" onClick={onSaveAndExit}>
      <Save className="ml-2 h-4 w-4" />
      שמור וצא
    </Button>
  );
};

export default SaveExitButton;


import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export const GeneratingAlert = () => {
  return (
    <Alert>
      <AlertTitle>Generating Draft</AlertTitle>
      <AlertDescription>
        We're generating your biography draft. This may take a few moments...
      </AlertDescription>
    </Alert>
  );
};


import { format } from 'date-fns';
import { FileQuestion, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export interface Biography {
  id: string;
  title: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface BiographyCardProps {
  biography: Biography;
  onDelete: (id: string) => void;
}

/**
 * Biography card component that displays a single biography with actions
 */
export const BiographyCard = ({ biography, onDelete }: BiographyCardProps) => {
  const navigate = useNavigate();

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'draft':
        return 'bg-yellow-200 text-yellow-800';
      case 'questionnairecompleted':
        return 'bg-blue-200 text-blue-800';
      case 'published':
        return 'bg-green-200 text-green-800';
      default:
        return 'bg-gray-200 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status.toLowerCase()) {
      case 'draft':
        return 'Draft';
      case 'questionnairecompleted':
        return 'Completed';
      case 'published':
        return 'Published';
      default:
        return status;
    }
  };

  return (
    <Card key={biography.id} className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <CardTitle className="text-xl font-bold text-memoir-darkGray truncate">
            {biography.title}
          </CardTitle>
          <Badge className={`${getStatusColor(biography.status)}`}>
            {getStatusText(biography.status)}
          </Badge>
        </div>
        <CardDescription>
          Updated {format(new Date(biography.updated_at), 'MMM d, yyyy')}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="pb-2">
        <div className="h-16 overflow-hidden">
          <p className="text-gray-600">
            {biography.title} - Click to continue working on this memoir
          </p>
        </div>
      </CardContent>
      
      <CardFooter className="flex justify-between">
        <Button 
          variant="outline" 
          className="border-[#5B9AA0] text-[#5B9AA0] hover:bg-[#5B9AA0] hover:text-white"
          onClick={() => navigate(`/biography/${biography.id}/questionnaire`)}
        >
          <FileQuestion className="mr-2 h-4 w-4" />
          Questionnaire
        </Button>
        
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" className="border-red-400 text-red-500 hover:bg-red-50">
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete your
                biography and all associated content.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-red-500 hover:bg-red-600"
                onClick={() => onDelete(biography.id)}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardFooter>
    </Card>
  );
};


import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, PlusCircle, FileQuestion, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from "sonner";
import NavBar from '@/components/NavBar';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useQuery } from '@tanstack/react-query';
import ErrorBoundary from '@/components/ErrorBoundary';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

type Biography = {
  id: string;
  title: string;
  status: string;
  created_at: string;
  updated_at: string;
};

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // Use react-query to fetch biographies with proper error handling
  const { 
    data: biographies = [], 
    isLoading, 
    error,
    refetch
  } = useQuery({
    queryKey: ['biographies'],
    queryFn: async (): Promise<Biography[]> => {
      try {
        const { data, error } = await supabase
          .from('biographies')
          .select('*')
          .order('updated_at', { ascending: false });
          
        if (error) {
          throw error;
        }
        
        return data || [];
      } catch (error) {
        console.error('Error fetching biographies:', error);
        throw error;
      }
    },
    retry: 1,
    retryDelay: 1000,
    refetchOnWindowFocus: false,
    enabled: !!user
  });

  const handleCreateBiography = async () => {
    try {
      const title = `New Biography - ${format(new Date(), 'MMM d, yyyy')}`;
      
      const { data, error } = await supabase
        .from('biographies')
        .insert([
          { title, user_id: user?.id }
        ])
        .select()
        .single();
        
      if (error) throw error;
      
      toast.success("New biography created");
      refetch(); // Refetch to update the list
      
      // Navigate to the questionnaire
      navigate(`/biography/${data.id}/questionnaire`);
    } catch (error) {
      console.error('Error creating biography:', error);
      toast.error("Failed to create new biography");
    }
  };

  const handleDeleteBiography = async (id: string) => {
    try {
      const { error } = await supabase
        .from('biographies')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      
      refetch(); // Refresh the list after deletion
      toast.success("Biography deleted successfully");
    } catch (error) {
      console.error('Error deleting biography:', error);
      toast.error("Failed to delete biography");
    }
  };

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
        return 'Questionnaire Completed';
      case 'published':
        return 'Published';
      default:
        return status;
    }
  };

  // Handle retry logic for data fetching
  const handleRetry = () => {
    refetch();
  };

  // Render function for biography cards
  const renderBiographyCards = () => {
    if (!biographies.length) {
      return (
        <Card className="border border-dashed border-gray-300 bg-gray-50">
          <CardContent className="pt-6 pb-10 flex flex-col items-center justify-center">
            <div className="h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <PlusCircle className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-600 mb-2">No biographies yet</h3>
            <p className="text-gray-500 text-center max-w-md mb-6">
              Start documenting your life story or the story of a loved one. Create your first biography now.
            </p>
            <Button 
              className="bg-[#FFD217] hover:bg-[#f8ca00] text-memoir-darkGray"
              onClick={handleCreateBiography}
            >
              <PlusCircle className="mr-2 h-5 w-5" />
              Create Your First Biography
            </Button>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {biographies.map((biography) => (
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
                      onClick={() => handleDeleteBiography(biography.id)}
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardFooter>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-white">
      <NavBar />
      
      <ErrorBoundary>
        <div className="container mx-auto px-4 py-8 pt-24">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-memoir-darkGray">My Biographies</h1>
              <p className="text-memoir-darkGray mt-2">Manage your life stories</p>
            </div>
            <Button 
              className="bg-[#FFD217] hover:bg-[#f8ca00] text-memoir-darkGray"
              onClick={handleCreateBiography}
              disabled={isLoading}
            >
              <PlusCircle className="mr-2 h-5 w-5" />
              New Biography
            </Button>
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <LoadingSpinner size="lg" text="Loading your biographies..." />
            </div>
          ) : error ? (
            <Alert className="bg-red-50 border-red-200 my-4">
              <AlertDescription className="flex flex-col items-center py-4">
                <div className="text-red-600 mb-2 text-center">
                  Failed to load your biographies
                </div>
                <Button 
                  variant="outline" 
                  onClick={handleRetry}
                  className="mt-2"
                >
                  Try Again
                </Button>
              </AlertDescription>
            </Alert>
          ) : (
            renderBiographyCards()
          )}
        </div>
      </ErrorBoundary>
    </div>
  );
};

export default Dashboard;

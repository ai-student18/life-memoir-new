import { useState } from 'react';
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
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ErrorBoundary from '@/components/ErrorBoundary';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { safeAsync, ErrorHandlerOptions } from '@/utils/errorHandler';
import { showErrorToast, showSuccessToast } from '@/utils/errorHandling';
import { PostgrestError } from '@supabase/supabase-js';
import type { Tables } from '@/integrations/supabase/types'; // Import Tables type

// Use Supabase generated type
// export interface Biography {
//   id: string;
//   title: string;
//   status: string;
//   created_at: string;
//   updated_at: string;
//   user_id: string; 
// }
type Biography = Tables<'biographies'>;

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const fetchBiographies = async (): Promise<Biography[]> => {
    if (!user) return [];
    const { data, error } = await supabase
      .from('biographies')
      .select('*')
      .eq('user_id', user.id) // Fetch only user's biographies
      .order('updated_at', { ascending: false });
    if (error) throw error;
    return data || [];
  };

  const { 
    data: biographies = [], 
    isLoading,
    error: queryError,
    refetch
  } = useQuery<Biography[], PostgrestError | Error, Biography[], ["biographies", string | undefined]>({
    queryKey: ['biographies', user?.id],
    queryFn: async () => {
      const [data, error] = await safeAsync(fetchBiographies(), {
        errorMessage: "Failed to fetch biographies",
      });
      if (error) throw error; // Let React Query handle and display via safeAsync
      return data || [];
    },
    enabled: !!user,
    onError: (err) => {
      // safeAsync already shows a toast. This is for additional specific handling if needed.
      console.error('Error in useQuery biographies:', err);
    }
  });

  const createBiographyMutation = useMutation<
    Biography, 
    PostgrestError | Error, 
    { title: string; userId: string }
  >(
    async ({ title, userId }) => {
      const [data, error] = await safeAsync(
        supabase
          .from('biographies')
          .insert([{ title, user_id: userId }])
          .select()
          .single()
          .then(response => {
            if (response.error) throw response.error;
            if (!response.data) throw new Error("No data returned after creating biography");
            return response.data as Biography;
          }),
        {
          errorMessage: "Failed to create new biography",
          // Success toast is handled in onSuccess for more specific message
          showToast: false, // Suppress default safeAsync error toast, handle in onError
        }
      );
      if (error) throw error;
      return data;
    },
    {
      onSuccess: (data) => {
        showSuccessToast("New biography created successfully!");
        queryClient.invalidateQueries(['biographies', user?.id]);
        navigate(`/biography/${data.id}/questionnaire`);
      },
      onError: (error) => {
        showErrorToast(error, "Error Creating Biography");
      }
    }
  );

  const deleteBiographyMutation = useMutation<
    void, // Supabase delete returns no data in success case
    PostgrestError | Error, 
    string // biographyId
  >(
    async (biographyId: string) => {
      const [, error] = await safeAsync(
        supabase
          .from('biographies')
          .delete()
          .eq('id', biographyId)
          .then(response => {
            if (response.error) throw response.error;
            // No data to return for delete
          }),
        {
          errorMessage: "Failed to delete biography",
          showToast: false, // Suppress default safeAsync error toast, handle in onError
        }
      );
      if (error) throw error;
    },
    {
      onSuccess: () => {
        showSuccessToast("Biography deleted successfully");
        queryClient.invalidateQueries(['biographies', user?.id]);
      },
      onError: (error) => {
        showErrorToast(error, "Error Deleting Biography");
      }
    }
  );

  const handleCreateBiography = async () => {
    if (!user) {
      showErrorToast("User not authenticated", "Authentication Error");
      return;
    }
    const title = `New Biography - ${format(new Date(), 'MMM d, yyyy')}`;
    createBiographyMutation.mutate({ title, userId: user.id });
  };

  const handleDeleteBiography = async (id: string) => {
    deleteBiographyMutation.mutate(id);
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
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
    switch (status?.toLowerCase()) {
      case 'draft':
        return 'Draft';
      case 'questionnairecompleted':
        return 'Questionnaire Completed'; // More descriptive
      case 'published':
        return 'Published';
      default:
        return status || 'Unknown';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <NavBar />
        <div className="flex-grow flex items-center justify-center">
          <LoadingSpinner size="lg" text="Loading biographies..." />
        </div>
      </div>
    );
  }

  if (queryError) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <NavBar />
        <div className="flex-grow flex items-center justify-center p-4">
          <Alert variant="destructive" className="max-w-lg">
            <AlertDescription className="text-center">
              There was an error loading your biographies. Please try again later.
              <Button onClick={() => refetch()} className="mt-4">Retry</Button>
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

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
              disabled={createBiographyMutation.isLoading}
            >
              {createBiographyMutation.isLoading ? 
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...</> :
                <><PlusCircle className="mr-2 h-5 w-5" /> Create Your First Biography</>
              }
            </Button>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {biographies.map((biography) => (
          <Card key={biography.id} className="overflow-hidden flex flex-col">
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
            
            <CardContent className="pb-2 flex-grow">
              {/* Content can be added here if needed */}
            </CardContent>
            
            <CardFooter className="flex justify-between items-center border-t pt-4">
              <Button 
                variant="outline" 
                className="border-[#5B9AA0] text-[#5B9AA0] hover:bg-[#5B9AA0] hover:text-white"
                onClick={() => navigate(`/biography/${biography.id}/questionnaire`)}
              >
                <FileQuestion className="mr-2 h-4 w-4" />
                View & Edit
              </Button>
              
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="border-red-400 text-red-500 hover:bg-red-50 hover:text-red-600"
                    disabled={deleteBiographyMutation.isLoading && deleteBiographyMutation.variables === biography.id}
                  >
                    {deleteBiographyMutation.isLoading && deleteBiographyMutation.variables === biography.id ? 
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 
                        <Trash2 className="mr-2 h-4 w-4" />
                    }
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
                      disabled={deleteBiographyMutation.isLoading}
                    >
                      {deleteBiographyMutation.isLoading ? 'Deleting...' : 'Delete'}
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
      
      <ErrorBoundary fallback={<p>Something went wrong displaying the dashboard.</p>}>
        <main className="container mx-auto px-4 py-8">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-memoir-darkGray">Your Biographies</h1>
            <Button 
              className="bg-[#FFD217] hover:bg-[#f8ca00] text-memoir-darkGray"
              onClick={handleCreateBiography}
              disabled={createBiographyMutation.isLoading}
            >
               {createBiographyMutation.isLoading ? 
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...</> :
                <><PlusCircle className="mr-2 h-5 w-5" /> Create New Biography</>
              }
            </Button>
          </div>
          {renderBiographyCards()}
        </main>
      </ErrorBoundary>
    </div>
  );
};

export default Dashboard;

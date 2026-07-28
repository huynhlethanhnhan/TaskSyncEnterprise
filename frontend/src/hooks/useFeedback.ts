import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { feedbackApi, type FeedbackItem } from '../api/services';

export const useMyFeedback = () => {
  return useQuery<FeedbackItem[], Error>({
    queryKey: ['feedback', 'my'],
    queryFn: () => feedbackApi.getMyFeedback(),
  });
};

export const useAllFeedback = (isAdminOrManager = false) => {
  return useQuery<FeedbackItem[], Error>({
    queryKey: ['feedback', 'all'],
    queryFn: () => feedbackApi.getAll(),
    enabled: isAdminOrManager,
  });
};

export const useSubmitFeedback = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<FeedbackItem>) => feedbackApi.submit(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feedback'] });
    },
  });
};

export const useReviewFeedback = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: { status: string; response?: string } }) =>
      feedbackApi.review(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feedback'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};

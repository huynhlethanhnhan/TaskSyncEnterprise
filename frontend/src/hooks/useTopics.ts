import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { topicsApi, type TopicItem } from '../api/services';
import { isValidEntityId } from '../utils/entityId';

export const useTopics = (projectId?: number) => {
  return useQuery<TopicItem[], Error>({
    queryKey: ['topics', { projectId }],
    queryFn: () => topicsApi.getAll(projectId ? { project_id: projectId } : {}),
    enabled: projectId === undefined || isValidEntityId(projectId),
  });
};

export const useTopicDetail = (id: number) => {
  return useQuery<TopicItem, Error>({
    queryKey: ['topics', id],
    queryFn: () => topicsApi.getById(id),
    enabled: isValidEntityId(id),
  });
};

export const useCreateTopic = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<TopicItem>) => topicsApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['topics'] });
    },
  });
};

export const useUpdateTopic = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<TopicItem> }) =>
      topicsApi.update(id, payload),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['topics'] });
      queryClient.invalidateQueries({ queryKey: ['topics', id] });
    },
  });
};

export const useDeleteTopic = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => topicsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['topics'] });
    },
  });
};

export const useCreateReply = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ topicId, payload }: { topicId: number; payload: { content: string } }) =>
      topicsApi.createReply(topicId, payload),
    onSuccess: (_, { topicId }) => {
      queryClient.invalidateQueries({ queryKey: ['topics'] });
      queryClient.invalidateQueries({ queryKey: ['topics', topicId] });
    },
  });
};

export const useUpdateReply = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ topicId, replyId, payload }: { topicId: number; replyId: number; payload: { content: string } }) =>
      topicsApi.updateReply(topicId, replyId, payload),
    onSuccess: (_, { topicId }) => {
      queryClient.invalidateQueries({ queryKey: ['topics', topicId] });
    },
  });
};

export const useDeleteReply = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ topicId, replyId }: { topicId: number; replyId: number }) =>
      topicsApi.deleteReply(topicId, replyId),
    onSuccess: (_, { topicId }) => {
      queryClient.invalidateQueries({ queryKey: ['topics', topicId] });
    },
  });
};

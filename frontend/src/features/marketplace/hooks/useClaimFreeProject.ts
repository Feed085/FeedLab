import { useMutation, useQueryClient } from '@tanstack/react-query';
import { marketplaceApi } from '../marketplace.api';
import type { ClaimFreeResponse } from '../types';

export const useClaimFreeProject = () => {
  const queryClient = useQueryClient();

  return useMutation<ClaimFreeResponse, Error, string>({
    mutationFn: (projectId: string) => marketplaceApi.claimFreeProject(projectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
};

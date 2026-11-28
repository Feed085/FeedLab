import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { HealthStatus } from '@/types';

export function useHealth() {
  return useQuery<HealthStatus>({
    queryKey: ['system-health'],
    queryFn: async () => {
      const response = await apiClient.get<HealthStatus>('/health');
      return response.data;
    },
    refetchInterval: 15000,
    retry: 2,
  });
}

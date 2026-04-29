import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { useConnectivityStore } from '@/stores/connectivityStore';

interface UseOfflineQueryOptions<TData> extends Omit<UseQueryOptions<TData>, 'queryFn'> {
  queryFn: () => Promise<TData>;
}

export function useOfflineQuery<TData>(options: UseOfflineQueryOptions<TData>) {
  const isOnline = useConnectivityStore((state) => state.isOnline);

  const queryResult = useQuery({
    ...options,
    queryFn: isOnline ? options.queryFn : () => Promise.reject(new Error('offline')),
    retry: isOnline ? 2 : false,
    enabled: isOnline && options.enabled !== false,
  });

  return {
    ...queryResult,
    isOffline: !isOnline && queryResult.isError,
  };
}

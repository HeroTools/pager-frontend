import { supabase } from '@/lib/supabase/client';
import { useQuery } from '@tanstack/react-query';

export const useSignedUrl = (path: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: ['signedUrl', path],
    queryFn: () =>
      supabase.storage
        .from('files')
        .createSignedUrl(path, 3600)
        .then((res) => res.data?.signedUrl ?? null),
    staleTime: 30 * 60 * 1000, // 30 min before refetch
    gcTime: 60 * 60 * 1000, // 1 hr in cache
    enabled: !!path && enabled,
  });
};

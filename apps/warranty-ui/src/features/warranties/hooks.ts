import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api, type WarrantyInput } from '@/lib/api';

export const useWarranties = () => useQuery({ queryKey: ['warranties'], queryFn: api.listWarranties });

export const useWarranty = (id: string) =>
  useQuery({ queryKey: ['warranties', id], queryFn: () => api.getWarranty(id) });

export const useUpdateWarranty = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: WarrantyInput) => api.updateWarranty(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['warranties'] }),
  });
};

export const useCreateWarranty = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: WarrantyInput) => api.createWarranty(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['warranties'] }),
  });
};

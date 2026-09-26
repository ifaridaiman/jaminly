import { router } from 'expo-router';

import { emptyWarranty, WarrantyForm } from '@/features/warranties/components/warranty-form';
import { useCreateWarranty } from '@/features/warranties/hooks';

export default function NewWarrantyScreen() {
  const create = useCreateWarranty();

  return (
    <WarrantyForm
      initial={emptyWarranty()}
      submitLabel="Save warranty"
      saving={create.isPending}
      saveError={create.isError ? "Couldn't save. Your changes are still here." : undefined}
      onSubmit={(input) => create.mutate(input, { onSuccess: () => router.back() })}
    />
  );
}

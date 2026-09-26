import { router } from 'expo-router';

import { emptyWarranty, WarrantyForm } from '@/features/warranties/components/warranty-form';
import { useSettings } from '@/features/settings/settings-provider';
import { useCreateWarranty } from '@/features/warranties/hooks';

export default function NewWarrantyScreen() {
  const create = useCreateWarranty();
  const { defaultReminders } = useSettings();

  return (
    <WarrantyForm
      title="New warranty"
      initial={{ ...emptyWarranty(), reminderOffsetsDays: defaultReminders }}
      saving={create.isPending}
      saveError={create.isError ? "Couldn't save. Your changes are still here." : undefined}
      onSubmit={(input) => create.mutate(input, { onSuccess: () => router.back() })}
    />
  );
}

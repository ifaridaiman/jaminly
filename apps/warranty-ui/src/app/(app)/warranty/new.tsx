import { router } from 'expo-router';

import { emptyWarranty, WarrantyForm } from '@/features/warranties/components/warranty-form';
import { registerForPush } from '@/features/notifications/push';
import { useSettings } from '@/features/settings/settings-provider';
import { useCreateWarranty } from '@/features/warranties/hooks';
import { ApiError, errorMessage } from '@/lib/api';

export default function NewWarrantyScreen() {
  const create = useCreateWarranty();
  const { defaultReminders, push } = useSettings();

  return (
    <WarrantyForm
      title="New warranty"
      initial={{ ...emptyWarranty(), reminderOffsetsDays: defaultReminders }}
      saving={create.isPending}
      saveError={create.error ? `${errorMessage(create.error)} Your changes are still here.` : undefined}
      serverErrors={create.error instanceof ApiError ? create.error.fields : undefined}
      onSubmit={(input) =>
        create.mutate(input, {
          onSuccess: () => {
            router.back();
            if (push) void registerForPush({ prompt: true }); // asks once; later calls just refresh
          },
        })
      }
    />
  );
}

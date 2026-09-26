import { useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Category, WarrantyInput } from '@/lib/api';

import { addMonths, formatDate } from '../status';
import { isValidDate, validateWarranty, type WarrantyErrors } from '../validate';
import { ProofPicker } from './proof-picker';

const CATEGORIES: { value: Category; label: string }[] = [
  { value: 'electronics', label: 'Electronics' },
  { value: 'appliance', label: 'Appliance' },
  { value: 'furniture', label: 'Furniture' },
  { value: 'vehicle', label: 'Vehicle' },
  { value: 'other', label: 'Other' },
];
const MONTH_PRESETS = [6, 12, 24, 36, 60];
const REMINDER_OPTIONS = [60, 30, 14, 7, 0];

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const emptyWarranty = (): WarrantyInput => ({
  productName: '',
  category: 'electronics',
  purchaseDate: today(),
  warrantyMonths: 12,
  expiryDate: '',
  coverage: { covered: [], notCovered: [] },
  proofOfPurchase: [],
  reminderOffsetsDays: [30, 7, 0],
});

const lines = (text: string) => text.split('\n').map((l) => l.trim()).filter(Boolean);

type Props = {
  initial: WarrantyInput;
  submitLabel: string;
  saving: boolean;
  saveError?: string;
  onSubmit: (input: WarrantyInput) => void;
};

export function WarrantyForm({ initial, submitLabel, saving, saveError, onSubmit }: Props) {
  const theme = useTheme();
  const [productName, setProductName] = useState(initial.productName);
  const [brand, setBrand] = useState(initial.brand ?? '');
  const [model, setModel] = useState(initial.model ?? '');
  const [serialNumber, setSerialNumber] = useState(initial.serialNumber ?? '');
  const [category, setCategory] = useState(initial.category);
  const [store, setStore] = useState(initial.store ?? '');
  const [purchaseDate, setPurchaseDate] = useState(initial.purchaseDate);
  const [months, setMonths] = useState(String(initial.warrantyMonths));
  const [covered, setCovered] = useState(initial.coverage.covered.join('\n'));
  const [notCovered, setNotCovered] = useState(initial.coverage.notCovered.join('\n'));
  const [notes, setNotes] = useState(initial.coverage.notes ?? '');
  const [reminders, setReminders] = useState(initial.reminderOffsetsDays);
  const [proof, setProof] = useState(initial.proofOfPurchase);
  const [errors, setErrors] = useState<WarrantyErrors>({});

  const warrantyMonths = Number(months);
  const expiryDate =
    isValidDate(purchaseDate) && Number.isInteger(warrantyMonths) && warrantyMonths > 0
      ? addMonths(purchaseDate, warrantyMonths)
      : null;

  function submit() {
    const opt = (s: string) => s.trim() || undefined;
    const input: WarrantyInput = {
      ...initial,
      productName: productName.trim(),
      brand: opt(brand),
      model: opt(model),
      serialNumber: opt(serialNumber),
      category,
      store: opt(store),
      purchaseDate: purchaseDate.trim(),
      warrantyMonths,
      expiryDate: expiryDate ?? initial.expiryDate,
      coverage: { covered: lines(covered), notCovered: lines(notCovered), notes: opt(notes) },
      proofOfPurchase: proof,
      reminderOffsetsDays: [...reminders].sort((a, b) => b - a),
    };
    const found = validateWarranty(input);
    setErrors(found);
    if (Object.keys(found).length === 0) onSubmit(input);
  }

  const toggleReminder = (d: number) =>
    setReminders((r) => (r.includes(d) ? r.filter((x) => x !== d) : [...r, d]));

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets>
      <Section title="Proof of purchase *">
        <ProofPicker value={proof} onChange={setProof} error={errors.proofOfPurchase} />
      </Section>

      <Section title="Product">
        <Field label="Name *" value={productName} onChangeText={setProductName} error={errors.productName} />
        <Field label="Brand" value={brand} onChangeText={setBrand} />
        <Field label="Model" value={model} onChangeText={setModel} />
        <Field label="Serial number" value={serialNumber} onChangeText={setSerialNumber} autoCapitalize="characters" />
        <ThemedText type="small" themeColor="textSecondary">Category</ThemedText>
        <ChipRow>
          {CATEGORIES.map((c) => (
            <Chip key={c.value} label={c.label} selected={category === c.value} onPress={() => setCategory(c.value)} />
          ))}
        </ChipRow>
      </Section>

      <Section title="Purchase">
        {/* ponytail: text date entry. Swap for a native date picker when we add one. */}
        <Field
          label="Purchase date * (YYYY-MM-DD)"
          value={purchaseDate}
          onChangeText={setPurchaseDate}
          error={errors.purchaseDate}
          keyboardType="numbers-and-punctuation"
          autoCapitalize="none"
        />
        <Field label="Store" value={store} onChangeText={setStore} />
      </Section>

      <Section title="Warranty">
        <ChipRow>
          {MONTH_PRESETS.map((m) => (
            <Chip key={m} label={`${m} months`} selected={months === String(m)} onPress={() => setMonths(String(m))} />
          ))}
        </ChipRow>
        <Field label="Length in months *" value={months} onChangeText={setMonths} error={errors.warrantyMonths} keyboardType="number-pad" />
        <ThemedText themeColor="textSecondary">
          Expires {expiryDate ? formatDate(expiryDate) : '—'}
        </ThemedText>
      </Section>

      <Section title="Coverage">
        <Field label="Covered (one per line)" value={covered} onChangeText={setCovered} multiline />
        <Field label="Not covered (one per line)" value={notCovered} onChangeText={setNotCovered} multiline />
        <Field label="Notes" value={notes} onChangeText={setNotes} multiline />
      </Section>

      <Section title="Remind me">
        <ChipRow>
          {REMINDER_OPTIONS.map((d) => (
            <Chip
              key={d}
              label={d === 0 ? 'On expiry day' : `${d} days before`}
              selected={reminders.includes(d)}
              onPress={() => toggleReminder(d)}
              multi
            />
          ))}
        </ChipRow>
      </Section>

      {saveError && <ErrorText>{saveError}</ErrorText>}
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ busy: saving, disabled: saving }}
        disabled={saving}
        onPress={submit}
        style={({ pressed }) => [styles.button, { backgroundColor: theme.primary, opacity: pressed ? 0.85 : 1 }]}>
        {saving ? (
          <ActivityIndicator color={theme.onPrimary} />
        ) : (
          <ThemedText style={[styles.buttonLabel, { color: theme.onPrimary }]}>{submitLabel}</ThemedText>
        )}
      </Pressable>
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <ThemedText type="smallBold" themeColor="textSecondary" accessibilityRole="header">
        {title.toUpperCase()}
      </ThemedText>
      {children}
    </View>
  );
}

function Field({ label, error, multiline, ...props }: TextInputProps & { label: string; error?: string }) {
  const theme = useTheme();
  return (
    <View style={styles.field}>
      <ThemedText type="small" themeColor="textSecondary">{label}</ThemedText>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={theme.textSecondary}
        multiline={multiline}
        style={[
          styles.input,
          multiline && styles.multiline,
          { color: theme.text, backgroundColor: theme.backgroundElement, borderColor: error ? theme.danger : theme.border },
        ]}
        {...props}
      />
      {error && <ErrorText>{error}</ErrorText>}
    </View>
  );
}

function ErrorText({ children }: { children: string }) {
  const theme = useTheme();
  return (
    <ThemedText type="small" accessibilityLiveRegion="polite" style={{ color: theme.danger }}>
      {children}
    </ThemedText>
  );
}

function ChipRow({ children }: { children: ReactNode }) {
  return <View style={styles.chipRow}>{children}</View>;
}

function Chip({ label, selected, onPress, multi }: { label: string; selected: boolean; onPress: () => void; multi?: boolean }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole={multi ? 'checkbox' : 'radio'}
      accessibilityState={multi ? { checked: selected } : { selected }}
      onPress={onPress}
      style={[
        styles.chip,
        { borderColor: selected ? theme.primary : theme.border },
        selected && { backgroundColor: theme.primary },
      ]}>
      <ThemedText type="small" style={{ color: selected ? theme.onPrimary : theme.text }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.three, gap: Spacing.four, width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center' },
  section: { gap: Spacing.two },
  field: { gap: Spacing.one },
  input: { minHeight: 48, borderWidth: 1, borderRadius: 8, paddingHorizontal: Spacing.three, fontSize: 17 },
  multiline: { minHeight: 88, paddingVertical: Spacing.two, textAlignVertical: 'top' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  chip: { minHeight: 36, justifyContent: 'center', paddingHorizontal: Spacing.three, borderRadius: 18, borderWidth: 1 },
  button: { minHeight: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.five },
  buttonLabel: { fontSize: 17, fontWeight: 600 },
});

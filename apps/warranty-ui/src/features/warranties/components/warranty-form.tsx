import { router } from 'expo-router';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { Fragment, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';

import { DateField } from '@/components/date-field';
import { ModalHeader } from '@/components/modal-header';
import { OptionSheet, type Option } from '@/components/option-sheet';
import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Category, WarrantyInput } from '@/lib/api';
import { confirm } from '@/lib/confirm';

import { COVERAGE_TEMPLATES } from '../coverage-templates';
import { addMonths, formatDate, toYmd } from '../status';
import { validateWarranty, type WarrantyErrors } from '../validate';
import { ProofPicker } from './proof-picker';

export const CATEGORIES: { value: Category; label: string }[] = [
  { value: 'electronics', label: 'Electronics' },
  { value: 'appliance', label: 'Appliance' },
  { value: 'furniture', label: 'Furniture' },
  { value: 'vehicle', label: 'Vehicle' },
  { value: 'other', label: 'Other' },
];
const LENGTHS = [6, 12, 18, 24, 36, 60];
const REMINDER_OPTIONS = [60, 30, 14, 7, 0];
// ponytail: one currency for now. Make it a user setting when people outside Malaysia use the app.
const DEFAULT_CURRENCY = 'MYR';

export const emptyWarranty = (): WarrantyInput => ({
  productName: '',
  category: 'electronics',
  purchaseDate: toYmd(new Date()),
  warrantyMonths: 12,
  expiryDate: '',
  coverage: { covered: [], notCovered: [] },
  proofOfPurchase: [],
  reminderOffsetsDays: [30, 7, 0],
});

const formatMoney = (amount: number, currency: string) =>
  new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    currencyDisplay: 'narrowSymbol',
    minimumFractionDigits: 2,
  }).format(amount);

/** "RM 2,999.00" → 2999. Empty → undefined, garbage → NaN. */
function parsePrice(text: string) {
  if (!text.trim()) return undefined;
  const digits = text.replace(/[^0-9.]/g, '');
  return digits ? Number(digits) : NaN;
}

type Props = {
  title: string;
  initial: WarrantyInput;
  saving: boolean;
  saveError?: string;
  onSubmit: (input: WarrantyInput) => void;
};

export function WarrantyForm({ title, initial, saving, saveError, onSubmit }: Props) {
  const theme = useTheme();
  const [productName, setProductName] = useState(initial.productName);
  const [brand, setBrand] = useState(initial.brand ?? '');
  const [model, setModel] = useState(initial.model ?? '');
  const [serialNumber, setSerialNumber] = useState(initial.serialNumber ?? '');
  const [category, setCategory] = useState(initial.category);
  const [store, setStore] = useState(initial.store ?? '');
  const [purchaseDate, setPurchaseDate] = useState(initial.purchaseDate);
  const [price, setPrice] = useState(initial.price ? formatMoney(initial.price.amount, initial.price.currency) : '');
  const [months, setMonths] = useState(initial.warrantyMonths);
  const [expiryOverride, setExpiryOverride] = useState(
    initial.expiryDate && initial.expiryDate !== addMonths(initial.purchaseDate, initial.warrantyMonths)
      ? initial.expiryDate
      : null,
  );
  const [covered, setCovered] = useState(initial.coverage.covered);
  const [notCovered, setNotCovered] = useState(initial.coverage.notCovered);
  const [notes, setNotes] = useState(initial.coverage.notes ?? '');
  const [reminders, setReminders] = useState(initial.reminderOffsetsDays);
  const [proof, setProof] = useState(initial.proofOfPurchase);
  const [errors, setErrors] = useState<WarrantyErrors & { price?: string }>({});
  const [sheet, setSheet] = useState<'category' | 'length' | null>(null);

  const currency = initial.price?.currency ?? DEFAULT_CURRENCY;
  const expiryDate = expiryOverride ?? addMonths(purchaseDate, months);
  const priceAmount = parsePrice(price);

  function build(): WarrantyInput {
    const opt = (s: string) => s.trim() || undefined;
    return {
      ...initial,
      productName: productName.trim(),
      brand: opt(brand),
      model: opt(model),
      serialNumber: opt(serialNumber),
      category,
      store: opt(store),
      purchaseDate,
      price: priceAmount === undefined ? undefined : { amount: priceAmount, currency },
      warrantyMonths: months,
      expiryDate,
      coverage: { covered, notCovered, notes: opt(notes) },
      proofOfPurchase: proof,
      reminderOffsetsDays: [...reminders].sort((a, b) => b - a),
    };
  }

  const [snapshot] = useState(() => JSON.stringify(build()));
  const dirty = JSON.stringify(build()) !== snapshot;

  function submit() {
    const input = build();
    const found: typeof errors = validateWarranty(input);
    if (priceAmount !== undefined && !(priceAmount >= 0)) found.price = 'Enter a valid price, e.g. 2999.00';
    setErrors(found);
    if (Object.keys(found).length === 0) onSubmit(input);
  }

  async function cancel() {
    if (!dirty || (await confirm('Discard changes?', 'Your changes to this warranty will be lost.', 'Discard')))
      router.back();
  }

  function applyTemplate() {
    const t = COVERAGE_TEMPLATES[category];
    setCovered((c) => [...c, ...t.covered.filter((x) => !c.includes(x))]);
    setNotCovered((c) => [...c, ...t.notCovered.filter((x) => !c.includes(x))]);
  }

  const toggleReminder = (d: number) => setReminders((r) => (r.includes(d) ? r.filter((x) => x !== d) : [...r, d]));

  const lengthOptions: Option<number>[] = [...new Set([...LENGTHS, months])]
    .sort((a, b) => a - b)
    .map((m) => ({ value: m, label: `${m} months` }));

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <ModalHeader
        title={title}
        left={
          <Pressable accessibilityRole="button" hitSlop={12} onPress={cancel}>
            <ThemedText style={[styles.headerButton, { color: theme.primary }]}>Cancel</ThemedText>
          </Pressable>
        }
        right={
          saving ? (
            <ActivityIndicator color={theme.primary} />
          ) : (
            <Pressable accessibilityRole="button" hitSlop={12} onPress={submit}>
              <ThemedText style={[styles.headerButton, styles.save, { color: theme.primary }]}>Save</ThemedText>
            </Pressable>
          )
        }
      />
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets>
        {saveError && (
          <View style={[styles.banner, { backgroundColor: theme.dangerBg }]}>
            <ThemedText style={{ color: theme.danger }}>{saveError}</ThemedText>
          </View>
        )}

        <Section title="Proof of purchase" required>
          <ProofPicker value={proof} onChange={setProof} error={errors.proofOfPurchase} />
        </Section>

        <Section title="Product">
          <Group>
            <TextRow label="Name" required value={productName} onChangeText={setProductName} placeholder="Required" />
            <TextRow label="Brand" value={brand} onChangeText={setBrand} placeholder="Optional" />
            <TextRow label="Model" value={model} onChangeText={setModel} placeholder="Optional" />
            <TextRow
              label="Serial no."
              value={serialNumber}
              onChangeText={setSerialNumber}
              placeholder="Optional"
              autoCapitalize="characters"
            />
            <SelectRow
              label="Category"
              value={CATEGORIES.find((c) => c.value === category)?.label}
              onPress={() => setSheet('category')}
            />
          </Group>
          <FieldError message={errors.productName} />
        </Section>

        <Section title="Purchase">
          <Group>
            <Row label="Date" required>
              <DateField
                value={purchaseDate}
                onChange={setPurchaseDate}
                accessibilityLabel="Purchase date"
                maximumDate={new Date()}
              />
            </Row>
            <TextRow label="Store" value={store} onChangeText={setStore} placeholder="Optional" />
            <Row label="Price">
              <TextInput
                accessibilityLabel="Price"
                value={price}
                onChangeText={setPrice}
                onBlur={() =>
                  priceAmount !== undefined && priceAmount >= 0 && setPrice(formatMoney(priceAmount, currency))
                }
                placeholder={formatMoney(0, currency)}
                placeholderTextColor={theme.textSecondary}
                keyboardType="decimal-pad"
                style={[styles.input, { color: theme.text }]}
              />
            </Row>
          </Group>
          <FieldError message={errors.purchaseDate ?? errors.price} />
        </Section>

        <Section title="Warranty">
          <Group>
            <SelectRow label="Length" required value={`${months} months`} onPress={() => setSheet('length')} />
            <Row label="Expires">
              <View style={styles.expires}>
                {expiryOverride ? (
                  <DateField value={expiryOverride} onChange={setExpiryOverride} accessibilityLabel="Expiry date" />
                ) : (
                  <ThemedText>{formatDate(expiryDate)}</ThemedText>
                )}
                <Pressable
                  accessibilityRole="button"
                  hitSlop={8}
                  onPress={() => setExpiryOverride(expiryOverride ? null : expiryDate)}>
                  <ThemedText style={{ color: theme.primary }}>{expiryOverride ? 'Reset' : 'Change'}</ThemedText>
                </Pressable>
              </View>
            </Row>
          </Group>
          <ThemedText type="small" themeColor="textSecondary">
            {expiryOverride
              ? 'Set manually. Tap Reset to work it out again.'
              : 'Worked out from the purchase date and length.'}
          </ThemedText>
          <FieldError message={errors.warrantyMonths} />
        </Section>

        <Section
          title="Coverage"
          action={
            <Pressable accessibilityRole="button" hitSlop={8} onPress={applyTemplate}>
              <ThemedText type="small" style={{ color: theme.primary }}>
                Use template
              </ThemedText>
            </Pressable>
          }>
          <View style={[styles.coverage, { backgroundColor: theme.backgroundElement }]}>
            <ChipEditor
              title="Covered"
              icon={{
                ios: 'checkmark.circle',
                android: 'check_circle',
                web: 'check_circle',
              }}
              color={theme.success}
              items={covered}
              onChange={setCovered}
            />
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <ChipEditor
              title="Not covered"
              icon={{
                ios: 'minus.circle',
                android: 'do_not_disturb_on',
                web: 'do_not_disturb_on',
              }}
              color={theme.textSecondary}
              items={notCovered}
              onChange={setNotCovered}
            />
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <View style={styles.notes}>
              <ThemedText style={styles.notesLabel}>Notes</ThemedText>
              <TextInput
                accessibilityLabel="Notes"
                value={notes}
                onChangeText={setNotes}
                placeholder="Anything worth remembering when you claim"
                placeholderTextColor={theme.textSecondary}
                multiline
                style={[styles.input, styles.notesInput, { color: theme.text }]}
              />
            </View>
          </View>
        </Section>

        <Section title="Remind me">
          <View style={styles.chipRow}>
            {REMINDER_OPTIONS.map((d) => {
              const on = reminders.includes(d);
              return (
                <Pressable
                  key={d}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: on }}
                  onPress={() => toggleReminder(d)}
                  style={[
                    styles.reminder,
                    {
                      borderColor: on ? theme.primary : theme.border,
                      backgroundColor: on ? theme.primary + '1A' : 'transparent',
                    },
                  ]}>
                  {on && (
                    <SymbolView
                      name={{
                        ios: 'checkmark',
                        android: 'check',
                        web: 'check',
                      }}
                      size={14}
                      tintColor={theme.primary}
                    />
                  )}
                  <ThemedText style={[styles.reminderLabel, { color: on ? theme.primary : theme.text }]}>
                    {d === 0 ? 'On expiry day' : `${d} days`}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        </Section>

        <OptionSheet
          visible={sheet === 'category'}
          title="Category"
          options={CATEGORIES}
          selected={category}
          onSelect={setCategory}
          onClose={() => setSheet(null)}
        />
        <OptionSheet
          visible={sheet === 'length'}
          title="Warranty length"
          options={lengthOptions}
          selected={months}
          onSelect={setMonths}
          onClose={() => setSheet(null)}
        />
      </ScrollView>
    </View>
  );
}

function Section({
  title,
  required,
  action,
  children,
}: {
  title: string;
  required?: boolean;
  action?: ReactNode;
  children: ReactNode;
}) {
  const theme = useTheme();
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionTitle} accessibilityRole="header">
          {title.toUpperCase()}
          {required && (
            <ThemedText type="smallBold" style={{ color: theme.danger }}>
              {' '}
              *
            </ThemedText>
          )}
        </ThemedText>
        {action}
      </View>
      {children}
    </View>
  );
}

function Group({ children }: { children: ReactNode[] }) {
  const theme = useTheme();
  return (
    <View style={[styles.group, { backgroundColor: theme.backgroundElement }]}>
      {children.map((child, i) => (
        <Fragment key={i}>
          {i > 0 && <View style={[styles.divider, { backgroundColor: theme.border }]} />}
          {child}
        </Fragment>
      ))}
    </View>
  );
}

function Row({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) {
  const theme = useTheme();
  return (
    <View style={styles.row}>
      <ThemedText style={styles.rowLabel}>
        {label}
        {required && <ThemedText style={{ color: theme.danger }}> *</ThemedText>}
      </ThemedText>
      {children}
    </View>
  );
}

function TextRow({ label, required, ...props }: TextInputProps & { label: string; required?: boolean }) {
  const theme = useTheme();
  return (
    <Row label={label} required={required}>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={theme.textSecondary}
        style={[styles.input, { color: theme.text }]}
        {...props}
      />
    </Row>
  );
}

function SelectRow({
  label,
  required,
  value,
  onPress,
}: {
  label: string;
  required?: boolean;
  value?: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${label}, ${value}`} onPress={onPress}>
      <Row label={label} required={required}>
        <View style={styles.select}>
          <ThemedText themeColor="textSecondary">{value}</ThemedText>
          <SymbolView
            name={{
              ios: 'chevron.up.chevron.down',
              android: 'unfold_more',
              web: 'unfold_more',
            }}
            size={14}
            tintColor={theme.textSecondary}
          />
        </View>
      </Row>
    </Pressable>
  );
}

function ChipEditor({
  title,
  icon,
  color,
  items,
  onChange,
}: {
  title: string;
  icon: SymbolViewProps['name'];
  color: string;
  items: string[];
  onChange: (items: string[]) => void;
}) {
  const theme = useTheme();
  const [adding, setAdding] = useState(false);
  const [text, setText] = useState('');

  function commit() {
    const value = text.trim();
    if (value && !items.includes(value)) onChange([...items, value]);
    setText('');
    setAdding(false);
  }

  return (
    <View style={styles.chipEditor}>
      <View style={styles.chipTitle}>
        <SymbolView name={icon} size={16} tintColor={color} />
        <ThemedText type="smallBold" style={{ color }}>
          {title}
        </ThemedText>
      </View>
      <View style={styles.chipRow}>
        {items.map((item) => (
          <View key={item} style={[styles.chip, { backgroundColor: theme.background, borderColor: theme.border }]}>
            <ThemedText style={styles.chipLabel}>{item}</ThemedText>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Remove ${item}`}
              hitSlop={10}
              onPress={() => onChange(items.filter((x) => x !== item))}>
              <SymbolView
                name={{ ios: 'xmark', android: 'close', web: 'close' }}
                size={12}
                tintColor={theme.textSecondary}
              />
            </Pressable>
          </View>
        ))}
        {adding ? (
          <TextInput
            autoFocus
            accessibilityLabel={`Add to ${title}`}
            value={text}
            onChangeText={setText}
            onSubmitEditing={commit}
            onBlur={commit}
            returnKeyType="done"
            placeholder="Type and press return"
            placeholderTextColor={theme.textSecondary}
            style={[
              styles.chip,
              styles.chipInput,
              {
                color: theme.text,
                backgroundColor: theme.background,
                borderColor: theme.primary,
              },
            ]}
          />
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Add to ${title}`}
            onPress={() => setAdding(true)}
            style={[styles.chip, styles.addChip, { borderColor: theme.border }]}>
            <ThemedText style={[styles.chipLabel, { color: theme.primary }]}>+ Add</ThemedText>
          </Pressable>
        )}
      </View>
    </View>
  );
}

function FieldError({ message }: { message?: string }) {
  const theme = useTheme();
  if (!message) return null;
  return (
    <ThemedText type="small" accessibilityLiveRegion="polite" style={{ color: theme.danger }}>
      {message}
    </ThemedText>
  );
}

const webNoOutline = { outlineStyle: 'none' } as object;

const styles = StyleSheet.create({
  content: {
    padding: Spacing.three,
    paddingBottom: Spacing.six,
    gap: Spacing.four,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  screen: { flex: 1 },
  headerButton: { fontSize: 17 },
  save: { fontWeight: 600 },
  banner: { padding: Spacing.three, borderRadius: 12 },
  section: { gap: Spacing.two },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: { letterSpacing: 0.5 },
  group: { borderRadius: 16, paddingHorizontal: Spacing.three },
  divider: { height: StyleSheet.hairlineWidth },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
    minHeight: 50,
    paddingVertical: Spacing.one,
  },
  rowLabel: { fontSize: 17, fontWeight: 400 },
  input: {
    flex: 1,
    fontSize: 17,
    textAlign: 'right',
    paddingVertical: Spacing.two,
    ...webNoOutline,
  },
  select: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  expires: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  coverage: { borderRadius: 16, padding: Spacing.three, gap: Spacing.three },
  chipEditor: { gap: Spacing.two },
  chipTitle: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: 36,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  chipLabel: { fontSize: 15 },
  chipInput: { minWidth: 160, fontSize: 15, ...webNoOutline },
  addChip: { borderStyle: 'dashed' },
  notes: { gap: Spacing.one },
  notesLabel: { fontSize: 15, fontWeight: 600 },
  notesInput: {
    textAlign: 'left',
    minHeight: 48,
    paddingVertical: 0,
    textAlignVertical: 'top',
  },
  reminder: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 38,
    paddingHorizontal: 14,
    borderRadius: 19,
    borderWidth: 1,
  },
  reminderLabel: { fontSize: 15, fontWeight: 500 },
});

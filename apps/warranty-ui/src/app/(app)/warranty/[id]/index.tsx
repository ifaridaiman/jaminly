import * as Clipboard from 'expo-clipboard';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Fragment, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ModalHeader } from '@/components/modal-header';
import { ReceiptSketch } from '@/components/receipt-sketch';
import { ThemedText } from '@/components/themed-text';
import { Fonts, MaxContentWidth, Spacing } from '@/constants/theme';
import { StatusBadge } from '@/features/warranties/components/status-badge';
import { CATEGORIES } from '@/features/warranties/components/warranty-form';
import { useDeleteWarranty, useWarranty } from '@/features/warranties/hooks';
import { expiryLabel, formatDate, formatReminders, getStatus, percentUsed } from '@/features/warranties/status';
import { useTheme } from '@/hooks/use-theme';
import type { Warranty } from '@/lib/api';
import { confirm } from '@/lib/confirm';

const formatPrice = (p: NonNullable<Warranty['price']>) =>
  new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: p.currency,
    currencyDisplay: 'narrowSymbol',
    maximumFractionDigits: 0,
  }).format(p.amount);

export default function WarrantyDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const { data: w, isPending, isError, refetch } = useWarranty(id);
  const remove = useDeleteWarranty(id);

  const header = (
    <ModalHeader
      left={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back to warranties"
          hitSlop={12}
          onPress={() => router.back()}
          style={styles.back}>
          <SymbolView
            name={{ ios: 'chevron.left', android: 'chevron_left', web: 'chevron_left' }}
            size={18}
            tintColor={theme.primary}
          />
          <ThemedText style={{ color: theme.primary, fontSize: 17 }}>Warranties</ThemedText>
        </Pressable>
      }
      right={
        w && (
          <Pressable
            accessibilityRole="button"
            hitSlop={12}
            onPress={() => router.push({ pathname: '/warranty/[id]/edit', params: { id } })}>
            <ThemedText style={{ color: theme.primary, fontSize: 17 }}>Edit</ThemedText>
          </Pressable>
        )
      }
    />
  );

  if (isPending || isError) {
    return (
      <View style={[styles.screen, { backgroundColor: theme.background }]}>
        {header}
        <View style={styles.center}>
          {isPending ? (
            <ActivityIndicator accessibilityLabel="Loading warranty" />
          ) : (
            <>
              <ThemedText>Couldn&apos;t load this warranty.</ThemedText>
              <Pressable accessibilityRole="button" onPress={() => refetch()}>
                <ThemedText style={{ color: theme.primary }}>Retry</ThemedText>
              </Pressable>
            </>
          )}
        </View>
      </View>
    );
  }

  const status = getStatus(w.expiryDate);
  const used = percentUsed(w.purchaseDate, w.expiryDate);
  const barColor = { active: theme.success, expiring_soon: theme.warning, expired: theme.danger }[status];
  const firstImage = w.proofOfPurchase.find((a) => a.mimeType.startsWith('image/') && a.url);
  const receiptCount = w.proofOfPurchase.length;
  const hasCoverage = w.coverage.covered.length + w.coverage.notCovered.length > 0;

  const details: [string, ReactNode][] = [
    ['Purchased', formatDate(w.purchaseDate)],
    ...(w.store ? [['Store', w.store] as [string, ReactNode]] : []),
    ...(w.price ? [['Price', formatPrice(w.price)] as [string, ReactNode]] : []),
    ['Category', CATEGORIES.find((c) => c.value === w.category)?.label],
    ...(w.serialNumber
      ? [['Serial', <SerialValue key="serial" serial={w.serialNumber} />] as [string, ReactNode]]
      : []),
    ['Reminders', formatReminders(w.reminderOffsetsDays)],
  ];

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      {header}
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`View ${receiptCount} receipt${receiptCount === 1 ? '' : 's'}`}
          onPress={() => router.push({ pathname: '/warranty/[id]/receipt', params: { id } })}
          style={[styles.hero, { backgroundColor: theme.backgroundElement }]}>
          {firstImage ? (
            <Image source={{ uri: firstImage.url }} style={StyleSheet.absoluteFill} contentFit="cover" />
          ) : (
            <View>
              {receiptCount > 1 && (
                <View style={[styles.backSheet, { transform: [{ rotate: '6deg' }] }]}>
                  <ReceiptSketch width={100} />
                </View>
              )}
              <View style={{ transform: [{ rotate: '-3deg' }] }}>
                <ReceiptSketch width={100} />
              </View>
            </View>
          )}
          <View style={styles.counter}>
            <SymbolView
              name={{ ios: 'arrow.up.left.and.arrow.down.right', android: 'open_in_full', web: 'open_in_full' }}
              size={12}
              tintColor="#FFFFFF"
            />
            <ThemedText type="small" style={styles.counterText}>
              1 / {receiptCount}
            </ThemedText>
          </View>
        </Pressable>

        <View style={styles.titleBlock}>
          <ThemedText style={styles.title} accessibilityRole="header">
            {w.productName}
          </ThemedText>
          {!!(w.brand || w.model) && (
            <ThemedText themeColor="textSecondary">{[w.brand, w.model].filter(Boolean).join(' · ')}</ThemedText>
          )}
        </View>

        <View style={styles.progressBlock}>
          <StatusBadge status={status} label={status === 'active' ? 'Active' : expiryLabel(w.expiryDate)} />
          <View
            style={[styles.track, { backgroundColor: theme.backgroundSelected }]}
            accessibilityRole="progressbar"
            accessibilityValue={{ min: 0, max: 100, now: used }}
            accessibilityLabel="Warranty period used">
            <View style={[styles.fill, { width: `${used}%`, backgroundColor: barColor }]} />
          </View>
          <View style={styles.progressLabels}>
            <ThemedText type="small" themeColor="textSecondary">
              {formatDate(w.purchaseDate)}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {used}% used
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {formatDate(w.expiryDate)}
            </ThemedText>
          </View>
        </View>

        <Section title="What's covered">
          {hasCoverage ? (
            <Group>
              {[
                ...w.coverage.covered.map((item) => ({ item, covered: true })),
                ...w.coverage.notCovered.map((item) => ({ item, covered: false })),
              ].map(({ item, covered }, i) => (
                <Row key={`${covered}-${item}`} first={i === 0}>
                  <View
                    style={styles.coverRow}
                    accessible
                    accessibilityLabel={`${covered ? 'Covered' : 'Not covered'}: ${item}`}>
                    <SymbolView
                      name={
                        covered
                          ? { ios: 'checkmark.circle', android: 'check_circle', web: 'check_circle' }
                          : { ios: 'minus.circle', android: 'do_not_disturb_on', web: 'do_not_disturb_on' }
                      }
                      size={20}
                      tintColor={covered ? theme.success : theme.textSecondary}
                    />
                    <ThemedText themeColor={covered ? 'text' : 'textSecondary'}>{item}</ThemedText>
                  </View>
                </Row>
              ))}
            </Group>
          ) : (
            <ThemedText themeColor="textSecondary">No coverage details yet. Tap Edit to add them.</ThemedText>
          )}
          {!!w.coverage.notes && (
            <ThemedText type="small" themeColor="textSecondary">
              {w.coverage.notes}
            </ThemedText>
          )}
        </Section>

        <Section title="Details">
          <Group>
            {details.map(([label, value], i) => (
              <Row key={label} first={i === 0}>
                <View style={styles.detailRow}>
                  <ThemedText themeColor="textSecondary">{label}</ThemedText>
                  {typeof value === 'string' ? <ThemedText style={styles.detailValue}>{value}</ThemedText> : value}
                </View>
              </Row>
            ))}
          </Group>
        </Section>

        <Pressable
          accessibilityRole="button"
          disabled={remove.isPending}
          onPress={async () => {
            if (
              await confirm(
                'Delete warranty?',
                `Delete "${w.productName}" and its receipts? This can't be undone.`,
                'Delete',
              )
            )
              remove.mutate(undefined, { onSuccess: () => router.back() });
          }}
          style={({ pressed }) => [
            styles.delete,
            { backgroundColor: pressed ? theme.dangerBg : theme.backgroundElement },
          ]}>
          {remove.isPending ? (
            <ActivityIndicator color={theme.danger} />
          ) : (
            <>
              <SymbolView
                name={{ ios: 'trash', android: 'delete', web: 'delete' }}
                size={18}
                tintColor={theme.danger}
              />
              <ThemedText style={[styles.deleteLabel, { color: theme.danger }]}>Delete warranty</ThemedText>
            </>
          )}
        </Pressable>
        {remove.isError && (
          <ThemedText type="small" style={{ color: theme.danger, textAlign: 'center' }}>
            Couldn&apos;t delete. Please try again.
          </ThemedText>
        )}
      </ScrollView>
    </View>
  );
}

function SerialValue({ serial }: { serial: string }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Serial ${serial}. Copy`}
      hitSlop={8}
      onPress={() => Clipboard.setStringAsync(serial)}
      style={styles.serial}>
      <ThemedText style={[styles.detailValue, { fontFamily: Fonts.mono }]}>{serial}</ThemedText>
      <SymbolView
        name={{ ios: 'doc.on.doc', android: 'content_copy', web: 'content_copy' }}
        size={14}
        tintColor={theme.textSecondary}
      />
    </Pressable>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionTitle} accessibilityRole="header">
        {title.toUpperCase()}
      </ThemedText>
      {children}
    </View>
  );
}

function Group({ children }: { children: ReactNode }) {
  const theme = useTheme();
  return <View style={[styles.group, { backgroundColor: theme.backgroundElement }]}>{children}</View>;
}

function Row({ first, children }: { first: boolean; children: ReactNode }) {
  const theme = useTheme();
  return (
    <Fragment>
      {!first && <View style={[styles.divider, { backgroundColor: theme.border }]} />}
      <View style={styles.row}>{children}</View>
    </Fragment>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.two },
  back: { flexDirection: 'row', alignItems: 'center', gap: 2, marginLeft: -Spacing.one },
  content: {
    padding: Spacing.three,
    paddingBottom: Spacing.six,
    gap: Spacing.four,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  hero: { height: 220, borderRadius: 20, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  backSheet: { position: 'absolute', left: 14, top: 4 },
  counter: {
    position: 'absolute',
    right: Spacing.three,
    bottom: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  counterText: { color: '#FFFFFF' },
  titleBlock: { gap: 2, marginTop: -Spacing.two },
  title: { fontSize: 22, lineHeight: 28, fontWeight: 700 },
  progressBlock: { gap: Spacing.two, marginTop: -Spacing.two },
  track: { height: 6, borderRadius: 3, overflow: 'hidden', marginTop: Spacing.two },
  fill: { height: '100%', borderRadius: 3 },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  section: { gap: Spacing.two },
  sectionTitle: { letterSpacing: 0.5 },
  group: { borderRadius: 16, paddingHorizontal: Spacing.three },
  row: { minHeight: 48, justifyContent: 'center', paddingVertical: Spacing.two },
  divider: { height: StyleSheet.hairlineWidth },
  coverRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  detailRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.three },
  detailValue: { flexShrink: 1, textAlign: 'right' },
  serial: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  delete: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    minHeight: 52,
    borderRadius: 14,
    marginTop: Spacing.two,
  },
  deleteLabel: { fontSize: 17, fontWeight: 600 },
});

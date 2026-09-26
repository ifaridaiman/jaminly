import * as DocumentPicker from 'expo-document-picker';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { OptionSheet, type Option } from '@/components/option-sheet';
import { ReceiptSketch } from '@/components/receipt-sketch';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Attachment } from '@/lib/api';

import { MAX_PROOF_FILES } from '../validate';

type Picked = { uri: string; mimeType?: string | null; size?: number; name?: string | null };
type Source = 'camera' | 'photos' | 'files';

const SOURCES: Option<Source>[] = [
  { value: 'camera', label: 'Take photo', icon: { ios: 'camera', android: 'photo_camera', web: 'photo_camera' } },
  { value: 'photos', label: 'Choose photo', icon: { ios: 'photo.on.rectangle', android: 'photo_library', web: 'photo_library' } },
  { value: 'files', label: 'Choose file', icon: { ios: 'doc', android: 'description', web: 'description' } },
];

function guessMime(uri: string, fallback: string) {
  const ext = uri.split('?')[0].split('.').pop()?.toLowerCase();
  return { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', heic: 'image/heic', pdf: 'application/pdf' }[ext ?? ''] ?? fallback;
}

const toAttachment = (f: Picked, fallbackMime: string): Attachment => ({
  id: `a${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
  url: f.uri,
  mimeType: f.mimeType || guessMime(f.name ?? f.uri, fallbackMime),
  sizeBytes: f.size ?? 0,
  name: f.name ?? undefined,
});

type Props = { value: Attachment[]; onChange: (next: Attachment[]) => void; error?: string };

export function ProofPicker({ value, onChange, error }: Props) {
  const theme = useTheme();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [pickError, setPickError] = useState<string | null>(null);
  const remaining = MAX_PROOF_FILES - value.length;

  const add = (files: Attachment[]) => onChange([...value, ...files].slice(0, MAX_PROOF_FILES));

  async function pick(source: Source) {
    setPickError(null);
    if (source === 'camera') {
      const { granted } = await ImagePicker.requestCameraPermissionsAsync();
      if (!granted) return setPickError('Camera access is off. Enable it in Settings to take a photo.');
      // quality 0.8 compresses the JPEG; resize with expo-image-manipulator if uploads get too big.
      const res = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8 });
      if (!res.canceled) add(res.assets.map((a) => toAttachment({ ...a, size: a.fileSize, name: a.fileName }, 'image/jpeg')));
    } else if (source === 'photos') {
      const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8, allowsMultipleSelection: true, selectionLimit: remaining });
      if (!res.canceled) add(res.assets.map((a) => toAttachment({ ...a, size: a.fileSize, name: a.fileName }, 'image/jpeg')));
    } else {
      const res = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/*'], multiple: true });
      if (!res.canceled) add(res.assets.map((a) => toAttachment(a, 'application/pdf')));
    }
  }

  // Web has no camera and one file dialog covers photos and PDFs, so skip the sheet there.
  const onAdd = () => (Platform.OS === 'web' ? pick('files') : setSheetOpen(true));

  return (
    <View style={styles.container}>
      <View style={styles.grid}>
        {value.map((a, i) => (
          <View key={a.id} style={[styles.tile, { backgroundColor: theme.background, borderColor: theme.border }]}>
            {a.mimeType.startsWith('image/') && a.url ? (
              <Image source={{ uri: a.url }} style={StyleSheet.absoluteFill} contentFit="cover" accessibilityLabel={`Receipt ${i + 1}`} />
            ) : a.mimeType === 'application/pdf' ? (
              <ThemedText type="smallBold" themeColor="textSecondary">PDF</ThemedText>
            ) : (
              <ReceiptSketch width={60} />
            )}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Remove receipt ${i + 1}`}
              hitSlop={8}
              onPress={() => onChange(value.filter((x) => x.id !== a.id))}
              style={styles.remove}>
              <SymbolView name={{ ios: 'xmark', android: 'close', web: 'close' }} size={12} tintColor="#FFFFFF" />
            </Pressable>
          </View>
        ))}
        {remaining > 0 && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add proof of purchase"
            onPress={onAdd}
            style={({ pressed }) => [
              styles.tile,
              styles.addTile,
              { borderColor: error ? theme.danger : theme.border, backgroundColor: pressed ? theme.backgroundSelected : theme.backgroundElement },
            ]}>
            <SymbolView name={{ ios: 'camera', android: 'photo_camera', web: 'photo_camera' }} size={22} tintColor={theme.primary} />
            <ThemedText type="smallBold" style={{ color: theme.primary }}>Add proof</ThemedText>
          </Pressable>
        )}
      </View>

      <ThemedText type="small" themeColor="textSecondary">
        Receipt or invoice. JPG, PNG, HEIC or PDF, up to {MAX_PROOF_FILES} files.
      </ThemedText>
      {(error || pickError) && (
        <ThemedText type="small" accessibilityLiveRegion="polite" style={{ color: theme.danger }}>
          {error ?? pickError}
        </ThemedText>
      )}

      <OptionSheet visible={sheetOpen} title="Add proof of purchase" options={SOURCES} onSelect={pick} onClose={() => setSheetOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.two },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  tile: { width: 90, height: 112, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  addTile: { borderStyle: 'dashed', gap: Spacing.one },
  remove: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#5A5D63',
  },
});

import * as DocumentPicker from 'expo-document-picker';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Attachment } from '@/lib/api';

import { MAX_PROOF_FILES } from '../validate';

type Picked = { uri: string; mimeType?: string | null; size?: number; name?: string | null };

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
  const [pickError, setPickError] = useState<string | null>(null);
  const remaining = MAX_PROOF_FILES - value.length;

  const add = (files: Attachment[]) => onChange([...value, ...files].slice(0, MAX_PROOF_FILES));

  async function takePhoto() {
    setPickError(null);
    const { granted } = await ImagePicker.requestCameraPermissionsAsync();
    if (!granted) return setPickError('Camera access is off. Enable it in Settings to take a photo.');
    // quality 0.8 compresses the JPEG; resize with expo-image-manipulator if uploads get too big.
    const res = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (!res.canceled) add(res.assets.map((a) => toAttachment({ ...a, size: a.fileSize, name: a.fileName }, 'image/jpeg')));
  }

  async function choosePhoto() {
    setPickError(null);
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsMultipleSelection: true,
      selectionLimit: remaining,
    });
    if (!res.canceled) add(res.assets.map((a) => toAttachment({ ...a, size: a.fileSize, name: a.fileName }, 'image/jpeg')));
  }

  async function chooseFile() {
    setPickError(null);
    const res = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/*'], multiple: true });
    if (!res.canceled) add(res.assets.map((a) => toAttachment(a, 'application/pdf')));
  }

  const actions = [
    ...(Platform.OS === 'web' ? [] : [{ label: 'Take photo', onPress: takePhoto }]),
    { label: 'Choose photo', onPress: choosePhoto },
    { label: 'Choose file', onPress: chooseFile },
  ];

  return (
    <View style={styles.container}>
      {value.length > 0 && (
        <View style={styles.grid}>
          {value.map((a, i) => (
            <View key={a.id} style={[styles.tile, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
              {a.mimeType.startsWith('image/') && a.url ? (
                <Image source={{ uri: a.url }} style={StyleSheet.absoluteFill} contentFit="cover" accessibilityLabel={`Receipt ${i + 1}`} />
              ) : (
                <ThemedText type="smallBold" themeColor="textSecondary">
                  {a.mimeType === 'application/pdf' ? 'PDF' : 'File'}
                </ThemedText>
              )}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Remove receipt ${i + 1}`}
                hitSlop={8}
                onPress={() => onChange(value.filter((x) => x.id !== a.id))}
                style={[styles.remove, { backgroundColor: theme.text }]}>
                <ThemedText type="smallBold" style={{ color: theme.background, lineHeight: 16 }}>
                  ×
                </ThemedText>
              </Pressable>
            </View>
          ))}
        </View>
      )}

      {remaining > 0 && (
        <View style={styles.actions}>
          {actions.map((a) => (
            <Pressable
              key={a.label}
              accessibilityRole="button"
              onPress={a.onPress}
              style={({ pressed }) => [
                styles.action,
                { borderColor: error ? theme.danger : theme.border, backgroundColor: pressed ? theme.backgroundSelected : 'transparent' },
              ]}>
              <ThemedText type="small" style={{ color: theme.primary }}>
                + {a.label}
              </ThemedText>
            </Pressable>
          ))}
        </View>
      )}

      <ThemedText type="small" themeColor="textSecondary">
        Receipt or invoice. JPG, PNG, HEIC or PDF, up to {MAX_PROOF_FILES} files, 10 MB each.
      </ThemedText>
      {(error || pickError) && (
        <ThemedText type="small" accessibilityLiveRegion="polite" style={{ color: theme.danger }}>
          {error ?? pickError}
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.two },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  tile: { width: 88, height: 88, borderRadius: 12, borderWidth: 1, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  remove: { position: 'absolute', top: 4, right: 4, width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  action: { minHeight: 44, justifyContent: 'center', paddingHorizontal: Spacing.three, borderRadius: 12, borderWidth: 1, borderStyle: 'dashed' },
});

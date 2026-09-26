import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { openBrowserAsync } from 'expo-web-browser';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ReceiptSketch } from '@/components/receipt-sketch';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useWarranty } from '@/features/warranties/hooks';

// ponytail: swipe between files, no pinch-zoom yet. Add a zoomable image view when receipts need it.
export default function ReceiptViewerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { width } = useWindowDimensions();
  const { data } = useWarranty(id);
  const [page, setPage] = useState(0);
  const files = data?.proofOfPurchase ?? [];

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.toolbar}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close" hitSlop={12} onPress={() => router.back()}>
          <SymbolView name={{ ios: 'xmark', android: 'close', web: 'close' }} size={22} tintColor="#FFFFFF" />
        </Pressable>
        <ThemedText style={styles.white}>
          {files.length ? page + 1 : 0} / {files.length}
        </ThemedText>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / width))}
        onScroll={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / width))}
        scrollEventThrottle={100}>
        {files.map((f, i) => (
          <View key={f.id} style={[styles.page, { width }]} accessibilityLabel={`Receipt ${i + 1} of ${files.length}`}>
            {f.mimeType.startsWith('image/') && f.url ? (
              <Image source={{ uri: f.url }} style={StyleSheet.absoluteFill} contentFit="contain" />
            ) : f.mimeType === 'application/pdf' && f.url ? (
              <Pressable accessibilityRole="button" onPress={() => openBrowserAsync(f.url)} style={styles.pdfButton}>
                <ThemedText style={styles.white}>Open PDF{f.name ? ` · ${f.name}` : ''}</ThemedText>
              </Pressable>
            ) : (
              <ReceiptSketch width={180} />
            )}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#000000' },
  toolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.three },
  white: { color: '#FFFFFF' },
  page: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  pdfButton: { paddingHorizontal: Spacing.four, paddingVertical: Spacing.three, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)' },
});

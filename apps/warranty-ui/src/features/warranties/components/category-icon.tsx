import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import type { Category } from '@/lib/api';

const ICONS: Record<Category, SymbolViewProps['name']> = {
  electronics: { ios: 'desktopcomputer', android: 'computer', web: 'computer' },
  appliance: { ios: 'washer', android: 'local_laundry_service', web: 'local_laundry_service' },
  furniture: { ios: 'sofa', android: 'chair', web: 'chair' },
  vehicle: { ios: 'car', android: 'directions_car', web: 'directions_car' },
  other: { ios: 'shippingbox', android: 'inventory_2', web: 'inventory_2' },
};

export function CategoryIcon({ category }: { category: Category }) {
  const theme = useTheme();
  return (
    <View style={[styles.tile, { backgroundColor: theme.background }]}>
      <SymbolView name={ICONS[category]} size={22} tintColor={theme.text} />
    </View>
  );
}

const styles = StyleSheet.create({
  tile: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});

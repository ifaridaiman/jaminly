import { TabList, TabSlot, TabTrigger, Tabs, type TabListProps, type TabTriggerSlotProps } from 'expo-router/ui';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export default function AppTabs() {
  return (
    <Tabs>
      <TabSlot style={{ height: '100%' }} />
      {/* Triggers must be direct children of the TabList element so Tabs can find the screens. */}
      <TabList asChild>
        <PillBar>
          <TabTrigger name="index" href="/" asChild>
            <TabButton icon="home">Home</TabButton>
          </TabTrigger>
          <TabTrigger name="settings" href="/settings" asChild>
            <TabButton icon="settings">Settings</TabButton>
          </TabTrigger>
        </PillBar>
      </TabList>
    </Tabs>
  );
}

function PillBar({ children, style, ...props }: TabListProps) {
  const theme = useTheme();
  return (
    <View {...props} style={styles.bar} pointerEvents="box-none">
      <View style={[styles.pill, { backgroundColor: theme.background, borderColor: theme.border }]}>{children}</View>
    </View>
  );
}

function TabButton({ children, isFocused, icon, ...props }: TabTriggerSlotProps & { icon: 'home' | 'settings' }) {
  const theme = useTheme();
  const color = isFocused ? theme.primary : theme.textSecondary;
  return (
    <Pressable
      {...props}
      style={[styles.tab, isFocused && { backgroundColor: theme.backgroundElement }]}>
      <SymbolView name={{ web: icon }} size={22} tintColor={color} />
      <ThemedText type="smallBold" style={{ color, fontSize: 12, lineHeight: 16 }}>
        {children}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: { position: 'absolute', bottom: 0, left: 0, right: 0, alignItems: 'center', padding: Spacing.three },
  pill: {
    flexDirection: 'row',
    padding: Spacing.one,
    borderRadius: 36,
    borderWidth: 1,
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
  },
  tab: { width: 96, alignItems: 'center', gap: 2, paddingVertical: Spacing.two, borderRadius: 32 },
});

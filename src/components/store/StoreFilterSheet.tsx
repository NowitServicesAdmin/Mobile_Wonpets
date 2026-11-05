import React, { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';
import { Button, Chip, T } from '../ui';
import { Category } from '../../services/store.service';

export type StoreFilters = {
  /** main category id (null = all) */
  cat: string | null;
  /** sub-category id under `cat` (null = all of that category) */
  sub: string | null;
  /** 0 = no limit */
  maxPrice: number;
  onSale: boolean;
};
export const noStoreFilters: StoreFilters = { cat: null, sub: null, maxPrice: 0, onSale: false };
export const storeFilterCount = (f: StoreFilters) => [f.cat, f.maxPrice > 0, f.onSale].filter(Boolean).length;

export const PRICE_STEPS = [500, 1000, 2500, 5000, 10000, 25000];
export const priceLabel = (n: number) => `Under ₹${n.toLocaleString('en-IN')}`;

const Label = ({ children }: { children: string }) => <Text className="text-[11px] font-bold text-muted uppercase mb-2">{children}</Text>;

export default function StoreFilterSheet({
  visible, value, categories, onClose, onApply,
}: { visible: boolean; value: StoreFilters; categories: Category[]; onClose: () => void; onApply: (f: StoreFilters) => void }) {
  const [f, setF] = useState<StoreFilters>(value);
  useEffect(() => { if (visible) setF(value); }, [visible, value]);
  const set = (p: Partial<StoreFilters>) => setF((x) => ({ ...x, ...p }));

  const mains = categories.filter((c) => !c.parent);
  const subs = f.cat ? categories.filter((c) => c.parent === f.cat) : [];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/40">
        <Pressable className="flex-1" onPress={onClose} accessibilityLabel="Close filters" />
        <View className="bg-white rounded-t-[28px] max-h-[88%]">
          <View className="flex-row justify-between items-center px-5 pt-5 pb-2">
            <Text className={T.h2}>Filters</Text>
            <Pressable onPress={onClose} hitSlop={8} accessibilityLabel="Close"><Ionicons name="close" size={24} color={colors.text} /></Pressable>
          </View>
          <ScrollView contentContainerClassName="px-5 pb-6 gap-5" keyboardShouldPersistTaps="handled">
            <View>
              <Label>Category</Label>
              <View className="flex-row flex-wrap gap-2">
                <Chip label="All" active={!f.cat} onPress={() => set({ cat: null, sub: null })} />
                {mains.map((c) => <Chip key={c.id} label={c.name} active={f.cat === c.id} onPress={() => set({ cat: c.id, sub: null })} />)}
              </View>
            </View>

            {subs.length > 0 && (
              <View>
                <Label>Sub-category</Label>
                <View className="flex-row flex-wrap gap-2">
                  <Chip label="All" active={!f.sub} onPress={() => set({ sub: null })} />
                  {subs.map((c) => <Chip key={c.id} label={c.name} active={f.sub === c.id} onPress={() => set({ sub: c.id })} />)}
                </View>
              </View>
            )}

            <View>
              <Label>Price</Label>
              <View className="flex-row flex-wrap gap-2">
                <Chip label="Any" active={f.maxPrice === 0} onPress={() => set({ maxPrice: 0 })} />
                {PRICE_STEPS.map((n) => <Chip key={n} label={priceLabel(n)} active={f.maxPrice === n} onPress={() => set({ maxPrice: n })} />)}
              </View>
            </View>

            <View className="flex-row items-center justify-between bg-cream rounded-2xl px-4 py-3">
              <View className="flex-1 pr-3">
                <Text className={T.h3}>On sale only</Text>
                <Text className={T.small}>Show items with a discount.</Text>
              </View>
              <Switch value={f.onSale} onValueChange={(v) => set({ onSale: v })} trackColor={{ true: colors.primary, false: '#E5DDD3' }} thumbColor="#fff" />
            </View>

            <View className="flex-row gap-3">
              <Button className="flex-1" variant="neutral" title="Reset" onPress={() => setF(noStoreFilters)} />
              <Button className="flex-1" title="Apply filters" onPress={() => { onApply(f); onClose(); }} />
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

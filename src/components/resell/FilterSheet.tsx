import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';
import { T, cn } from '../ui';
import { CATEGORY_EMOJI, CONDITIONS, PET_CATEGORIES, PRODUCT_CATEGORIES } from '../../data/resell';

export type Filters = { location: string; condition: string; min: string; max: string; category: string; type: 'All' | 'Pet' | 'Product' };
export const noFilters: Filters = { location: '', condition: 'All', min: '', max: '', category: 'All', type: 'All' };
export const activeFilterCount = (f: Filters) => [f.location.trim(), f.condition !== 'All', f.min, f.max, f.category !== 'All', f.type !== 'All'].filter(Boolean).length;

type IconName = React.ComponentProps<typeof Ionicons>['name'];

function Section({ icon, title, children }: { icon: IconName; title: string; children: React.ReactNode }) {
  return (
    <View className="gap-3">
      <View className="flex-row items-center gap-2">
        <View className="w-7 h-7 rounded-lg bg-primary-soft items-center justify-center"><Ionicons name={icon} size={14} color={colors.primary} /></View>
        <Text className="text-[13px] font-extrabold text-ink">{title}</Text>
      </View>
      {children}
    </View>
  );
}

const Opt = ({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) => (
  <Pressable onPress={onPress} className={cn('px-3.5 py-2 rounded-full border', on ? 'bg-primary border-primary' : 'bg-white border-line')}>
    <Text className={cn('text-xs font-bold', on ? 'text-white' : 'text-ink')}>{label}</Text>
  </Pressable>
);

export default function FilterSheet({ visible, value, onClose, onApply }: { visible: boolean; value: Filters; onClose: () => void; onApply: (f: Filters) => void }) {
  const [f, setF] = useState<Filters>(value);
  useEffect(() => { if (visible) setF(value); }, [visible]);
  const set = (p: Partial<Filters>) => setF((x) => ({ ...x, ...p }));
  const cats = f.type === 'Pet' ? PET_CATEGORIES : f.type === 'Product' ? PRODUCT_CATEGORIES : [...PET_CATEGORIES, ...PRODUCT_CATEGORIES];
  const n = activeFilterCount(f);
  const types = [['All', 'All', 'apps'], ['Pet', 'Pets', 'paw'], ['Product', 'Products', 'bag-handle']] as const;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1 justify-end bg-black/45">
        <Pressable className="flex-1" onPress={onClose} />
        <View className="bg-cream rounded-t-[32px] max-h-[90%]">
          <View className="items-center pt-2.5"><View className="w-11 h-1.5 rounded-full bg-line" /></View>
          <View className="flex-row justify-between items-center px-5 pt-3 pb-3">
            <View className="flex-row items-center gap-2.5">
              <Text className={T.h2}>Filters</Text>
              {n > 0 && <View className="bg-primary rounded-full min-w-[22px] h-[22px] px-1.5 items-center justify-center"><Text className="text-white text-[11px] font-extrabold">{n}</Text></View>}
            </View>
            <View className="flex-row items-center gap-3">
              {n > 0 && <Pressable hitSlop={8} onPress={() => setF(noFilters)}><Text className="text-primary font-bold text-[13px]">Clear all</Text></Pressable>}
              <Pressable onPress={onClose} className="w-9 h-9 rounded-full bg-white border border-line items-center justify-center"><Ionicons name="close" size={20} color={colors.text} /></Pressable>
            </View>
          </View>

          <ScrollView contentContainerClassName="px-5 pt-1 pb-6 gap-6" keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <Section icon="layers" title="Listing type">
              <View className="flex-row bg-primary-soft rounded-2xl p-1">
                {types.map(([v, label, icon]) => (
                  <Pressable key={v} onPress={() => set({ type: v, category: 'All' })} className={cn('flex-1 flex-row items-center justify-center gap-1.5 py-2.5 rounded-xl', f.type === v ? 'bg-primary' : 'bg-transparent')}>
                    <Ionicons name={icon} size={14} color={f.type === v ? '#fff' : colors.muted} />
                    <Text className={cn('text-xs font-bold', f.type === v ? 'text-white' : 'text-muted')}>{label}</Text>
                  </Pressable>
                ))}
              </View>
            </Section>

            <Section icon="grid" title="Category">
              <View className="flex-row flex-wrap gap-2">{['All', ...cats].map((c) => <Opt key={c} label={c === 'All' ? 'All' : `${CATEGORY_EMOJI[c] ?? ''} ${c}`.trim()} on={f.category === c} onPress={() => set({ category: c })} />)}</View>
            </Section>

            <Section icon="shield-checkmark" title="Condition">
              <View className="flex-row flex-wrap gap-2">{['All', ...CONDITIONS].map((c) => <Opt key={c} label={c} on={f.condition === c} onPress={() => set({ condition: c })} />)}</View>
            </Section>

            <Section icon="cash" title="Price range">
              <View className="flex-row items-center gap-3">
                {(['min', 'max'] as const).map((k, i) => (
                  <React.Fragment key={k}>
                    {i === 1 && <View className="w-3 h-0.5 bg-line" />}
                    <View className="flex-1 flex-row items-center bg-white border-[1.5px] border-line rounded-2xl px-3.5">
                      <Text className="text-primary font-extrabold mr-1.5">₹</Text>
                      <TextInput className="flex-1 py-3.5 text-[15px] text-ink" placeholder={k === 'min' ? 'Min' : 'Max'} placeholderTextColor={colors.muted} keyboardType="number-pad" value={f[k]} onChangeText={(v) => set({ [k]: v.replace(/\D/g, '') } as Partial<Filters>)} />
                    </View>
                  </React.Fragment>
                ))}
              </View>
            </Section>

            <Section icon="location" title="Location">
              <View className="flex-row items-center bg-white border-[1.5px] border-line rounded-2xl px-3.5">
                <Ionicons name="search-outline" size={17} color={colors.muted} />
                <TextInput className="flex-1 py-3.5 px-2 text-[15px] text-ink" placeholder="Area or city" placeholderTextColor={colors.muted} value={f.location} onChangeText={(v) => set({ location: v })} />
              </View>
            </Section>
          </ScrollView>

          <View className="flex-row gap-3 px-5 pt-3 pb-6 bg-white border-t border-line">
            <Pressable onPress={() => setF(noFilters)} className="flex-1 py-3.5 rounded-2xl border-[1.5px] border-line items-center active:opacity-80"><Text className="font-bold text-ink text-[15px]">Reset</Text></Pressable>
            <Pressable onPress={() => { onApply(f); onClose(); }} className="flex-[2] flex-row gap-2 py-3.5 rounded-2xl bg-primary items-center justify-center active:opacity-80"><Ionicons name="checkmark-circle" size={18} color="#fff" /><Text className="font-bold text-white text-[15px]">Apply filters</Text></Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
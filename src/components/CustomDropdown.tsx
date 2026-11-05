import React, { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import { cn } from './ui';

export type DropdownOption = { label: string; value: string };

type Props = {
  value: string;
  onChange: (value: string) => void;
  options?: DropdownOption[];
  placeholder?: string;
  searchable?: boolean;
  onCreate?: (label: string) => Promise<void> | void;
  createLabel?: string;
  loading?: boolean;
  disabled?: boolean;
  title?: string;
};

/** Mobile version of the web CustomDropdown: a tap-to-open bottom sheet with search + "create" row. */
export default function CustomDropdown({
  value, onChange, options = [], placeholder = 'Select Option', searchable = true,
  onCreate, createLabel = 'Create', loading = false, disabled = false, title,
}: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);

  const selected = options.find((o) => o.value === value);
  const q = search.trim().toLowerCase();
  const filtered = options.filter((o) => o.label.toLowerCase().includes(q));
  const canCreate = !!q && !options.some((o) => o.label.toLowerCase() === q);

  const close = () => { setOpen(false); setSearch(''); };
  const select = (o: DropdownOption) => { onChange(o.value); close(); };
  const create = async () => {
    if (!onCreate || creating || !search.trim()) return;
    try { setCreating(true); await onCreate(search.trim()); close(); } finally { setCreating(false); }
  };

  return (
    <>
      <Pressable
        disabled={disabled}
        onPress={() => setOpen(true)}
        className={cn(
          'h-12 px-4 rounded-2xl border-[1.5px] border-line flex-row items-center justify-between gap-2',
          disabled ? 'bg-primary-soft opacity-60' : 'bg-white',
        )}
      >
        <Text numberOfLines={1} className={cn('flex-1 text-[15px]', selected ? 'text-ink' : 'text-muted')}>
          {selected ? selected.label : placeholder}
        </Text>
        <Ionicons name="chevron-down" size={18} color={colors.muted} />
      </Pressable>

      <Modal visible={open} transparent animationType="slide" onRequestClose={close}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1 justify-end">
          <Pressable className="absolute inset-0 bg-black/40" onPress={close} />
          <View className="bg-cream rounded-t-3xl pt-3 pb-6 max-h-[70%]">
            <View className="self-center w-10 h-1 rounded-full bg-line mb-3" />
            <Text className="text-base font-extrabold text-ink px-5 mb-3">{title ?? placeholder}</Text>
            {searchable && (
              <View className="mx-4 mb-2 flex-row items-center gap-2 bg-white border border-line rounded-xl px-3">
                <Ionicons name="search" size={16} color={colors.muted} />
                <TextInput
                  value={search}
                  onChangeText={setSearch}
                  placeholder="Search..."
                  placeholderTextColor={colors.muted}
                  className="flex-1 py-2.5 text-sm text-ink"
                />
              </View>
            )}
            <ScrollView keyboardShouldPersistTaps="handled">
              {loading ? (
                <View className="py-5 flex-row items-center justify-center gap-2">
                  <ActivityIndicator color={colors.primary} />
                  <Text className="text-sm text-muted">Loading options...</Text>
                </View>
              ) : filtered.length > 0 ? (
                filtered.map((o) => (
                  <Pressable
                    key={o.value}
                    onPress={() => select(o)}
                    className={cn('px-5 py-3.5 flex-row items-center justify-between active:bg-primary-soft', value === o.value && 'bg-primary-soft')}
                  >
                    <Text className={cn('text-[15px]', value === o.value ? 'text-primary-dark font-bold' : 'text-ink')}>{o.label}</Text>
                    {value === o.value && <Ionicons name="checkmark" size={18} color={colors.primary} />}
                  </Pressable>
                ))
              ) : (
                <Text className="px-5 py-4 text-sm text-muted text-center">No options found</Text>
              )}
              {!loading && onCreate && canCreate && (
                <Pressable onPress={create} disabled={creating} className="px-5 py-3.5 flex-row items-center gap-2 border-t border-line">
                  {creating ? <ActivityIndicator size="small" color={colors.primary} /> : <Ionicons name="add-circle-outline" size={18} color={colors.primary} />}
                  <Text className="text-primary-dark font-bold text-sm flex-1" numberOfLines={1}>
                    {creating ? 'Adding...' : `${createLabel} "${search.trim()}"`}
                  </Text>
                </Pressable>
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

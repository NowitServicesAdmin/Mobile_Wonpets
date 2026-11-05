import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';
import { T, cn } from '../ui';
import { useLanguage } from '../../context/LanguageContext';

/** Settings > Language. Same list and search as the web header's language dropdown, now living in Settings. */
export default function LanguageSection() {
  const { language, languages, setLanguage, translating, error } = useLanguage();
  const [q, setQ] = useState('');
  const list = useMemo(() => languages.filter((l) => l.label.toLowerCase().includes(q.trim().toLowerCase())), [languages, q]);

  const pick = async (l: (typeof languages)[number]) => {
    if (l.code === language.code) return;
    await setLanguage(l);
    setQ('');
  };

  return (
    <View className="gap-3">
      <View className="flex-row items-center gap-2">
        <Text className={T.body + ' flex-1'}>Choose the language the app is shown in. Your choice is remembered on this device.</Text>
        {translating && <ActivityIndicator size="small" color={colors.primary} />}
      </View>

      <View className="flex-row items-center bg-white border border-line rounded-xl px-3 h-[42px]">
        <Ionicons name="search-outline" size={17} color={colors.muted} />
        <TextInput value={q} onChangeText={setQ} placeholder="Search language..." placeholderTextColor="#B8AEA5" className="flex-1 px-2 py-0 text-[14px] text-ink" autoCorrect={false} />
        {!!q && <Pressable hitSlop={8} onPress={() => setQ('')}><Ionicons name="close-circle" size={17} color="#C9BFB5" /></Pressable>}
      </View>

      <View className="rounded-2xl border border-line bg-white overflow-hidden" style={{ maxHeight: 320 }}>
        <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled">
          {list.length ? list.map((l, i) => {
            const active = l.code === language.code;
            return (
              <Pressable key={l.code} onPress={() => pick(l)} className={cn('flex-row items-center justify-between px-4 py-3 active:bg-cream', i > 0 && 'border-t border-line', active && 'bg-primary-soft')}>
                <Text noTranslate className={cn('text-[14px]', active ? 'font-bold text-ink' : 'text-ink')}>{l.label}</Text>
                {active && <Ionicons name="checkmark" size={18} color={colors.primary} />}
              </Pressable>
            );
          }) : <Text className="px-4 py-3 text-sm text-muted">No languages found</Text>}
        </ScrollView>
      </View>

      {!!error && language.code !== 'en' && <Text className="text-xs text-red">Some text could not be translated: {error}</Text>}
    </View>
  );
}
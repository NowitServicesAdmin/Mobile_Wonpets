import React, { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';
import { FAQS } from '../../data/settings';
import { T } from '../ui';
import { settingsService } from '../../services/settings.service';

export default function FaqSection() {
  const [open, setOpen] = useState<number | null>(null);
  const [faqs, setFaqs] = useState(FAQS);
  useEffect(() => { settingsService.getFaqs().then((l) => { if (l.length) setFaqs(l); }).catch(() => {}); }, []); // built-in answers stay if the server has none
  return (
    <View className="gap-2.5">
      {faqs.map((f, i) => (
        <View key={f.q} className="rounded-2xl border border-line bg-white overflow-hidden">
          <Pressable onPress={() => setOpen(open === i ? null : i)} className="flex-row items-center gap-3 p-3.5"><Text className={T.h3 + ' flex-1'}>{f.q}</Text><Ionicons name={open === i ? 'chevron-up' : 'chevron-down'} size={16} color={colors.primary} /></Pressable>
          {open === i && <View className="px-3.5 pb-3.5"><Text className={T.body}>{f.a}</Text></View>}
        </View>
      ))}
    </View>
  );
}

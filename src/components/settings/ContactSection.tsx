import React, { useEffect, useState } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';
import { CONTACT } from '../../data/settings';
import { T } from '../ui';
import { settingsService } from '../../services/settings.service';

export default function ContactSection() {
  const [c, setC] = useState(CONTACT);
  useEffect(() => { settingsService.getContact().then((r) => { if (r && (r.email || r.phone || r.address)) setC({ email: r.email || CONTACT.email, phone: r.phone || CONTACT.phone, address: r.address || CONTACT.address }); }).catch(() => {}); }, []);
  const rows = [
    { icon: 'mail', label: 'Email', value: c.email, url: `mailto:${c.email}` },
    { icon: 'call', label: 'Phone number', value: c.phone, url: `tel:${c.phone.replace(/\s/g, '')}` },
    { icon: 'location', label: 'Address', value: c.address, url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(c.address)}` },
  ] as const;
  return (
    <View className="gap-2.5">
      {rows.map((r) => (
        <Pressable key={r.label} onPress={() => Linking.openURL(r.url)} className="flex-row items-center gap-3 rounded-2xl border border-line bg-white p-3.5 active:bg-cream">
          <View className="w-10 h-10 rounded-xl bg-primary-soft items-center justify-center"><Ionicons name={r.icon} size={17} color={colors.primary} /></View>
          <View className="flex-1"><Text className={T.small}>{r.label}</Text><Text className="text-sm font-semibold text-ink">{r.value}</Text></View>
          <Ionicons name="open-outline" size={15} color={colors.muted} />
        </Pressable>
      ))}
    </View>
  );
}

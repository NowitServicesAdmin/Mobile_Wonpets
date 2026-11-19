import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';
import { Card, T, cn } from '../ui';
import { formatApptDate } from '../appointments/AppointmentCard';
import PetAvatar from '../PetAvatar';
import ProgressRing from '../ProgressRing';
import Popover, { Anchor, measureAnchor, useAnchorRef } from '../common/Popover';
import { Panel } from '../doctor/DoctorUI';
import { getPetAgeLabel, getPetAgeYears } from '../../utils/petAge';
import type { Appointment, Pet } from '../../data/mock';

const ageBadge = (age: number | null) => {
  if (age === null) return 'Unknown';
  if (age < 1) return 'Baby';
  if (age < 3) return 'Young Adult';
  if (age < 7) return 'Adult';
  return 'Senior';
};

type Props = { pets: Pet[]; appointments: Appointment[]; onOpenPet: (pet: Pet) => void };

export default function PetHealthOverview({ pets, appointments, onOpenPet }: Props) {
  const [idx, setIdx] = useState(0);
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const pillRef = useAnchorRef();
  const pet = pets.length ? pets[Math.min(idx, pets.length - 1)] : null;

  if (!pet) {
    return (
      <Card className="items-center py-5 border-orange-100">
        <Ionicons name="medkit-outline" size={30} color="#FDBA74" />
        <Text className={T.h3 + ' mt-2'}>No Health Records</Text>
        <Text className={T.small + ' mt-1 text-center'}>Add a pet to start tracking health statistics.</Text>
      </Card>
    );
  }

  const years = getPetAgeYears(pet);
  const ageProgress = years !== null ? Math.min(1, years / 20) : 0;
  const activity = pet.activity ?? 0;
  const lastVisit = appointments.find((a) => a.pet === pet.name && a.status === 'Completed');

  const lastLabel = lastVisit ? formatApptDate(lastVisit) : '—';
  const stats: { label: string; value: string; badge: string; icon: keyof typeof Ionicons.glyphMap; fg: string; box: string; progress: number }[] = [
    { label: 'Age', value: getPetAgeLabel(pet, '—'), badge: ageBadge(years), icon: 'gift-outline', fg: colors.pink, box: 'bg-pink-soft', progress: ageProgress },
    { label: 'Weight', value: String(pet.weight ?? '—'), badge: 'Normal', icon: 'barbell-outline', fg: colors.blue, box: 'bg-blue-soft', progress: 0.7 },
    { label: 'Activity', value: `${activity}%`, badge: activity >= 70 ? 'Active' : activity >= 40 ? 'Moderate' : 'Low', icon: 'pulse-outline', fg: '#06B6D4', box: 'bg-cyan-100', progress: activity / 100 },
    { label: 'Checkup', value: lastLabel, badge: lastVisit ? 'Up to Date' : 'None yet', icon: 'calendar-outline', fg: colors.primary, box: 'bg-primary-soft', progress: lastVisit ? 1 : 0 },
  ];

  return (
    <Panel compact className="border-orange-100">
      <View className="flex-row items-center justify-between gap-2 mb-2.5">
        <View className="flex-row items-center gap-2 flex-1">
          <View className="w-8 h-8 rounded-full bg-cyan-100 items-center justify-center"><Ionicons name="medkit" size={15} color="#0891B2" /></View>
          <Text maxFontSizeMultiplier={1.1} className="text-[15px] font-extrabold text-ink" numberOfLines={1}>Health Overview</Text>
        </View>

        {/* pet dropdown, like the web's select */}
        <Pressable
          ref={pillRef}
          onPress={() => measureAnchor(pillRef, (a) => { setAnchor(a); setOpen(true); })}
          accessibilityRole="button"
          accessibilityLabel="Choose pet"
          className="flex-row items-center gap-1.5 bg-orange-50 border border-orange-100 rounded-full pl-1 pr-2.5 py-1 max-w-[150px] active:opacity-80"
        >
          <PetAvatar emoji={pet.emoji} image={pet.image} size={22} />
          <Text maxFontSizeMultiplier={1.1} className="text-[12px] font-semibold text-ink flex-shrink" numberOfLines={1}>{pet.name}</Text>
          <Ionicons name="chevron-down" size={13} color={colors.primary} />
        </Pressable>
      </View>

      <Popover visible={open} onClose={() => setOpen(false)} anchor={anchor} width={200}>
        {pets.map((p, i) => (
          <Pressable key={p.id} onPress={() => { setIdx(i); setOpen(false); }} className={cn('flex-row items-center gap-2 px-2 py-2 rounded-xl active:opacity-70', i === idx && 'bg-orange-50')}>
            <PetAvatar emoji={p.emoji} image={p.image} size={26} />
            <Text maxFontSizeMultiplier={1.1} className="flex-1 text-[13px] font-semibold text-ink" numberOfLines={1}>{p.name}</Text>
            {i === idx && <Ionicons name="checkmark" size={15} color={colors.primary} />}
          </Pressable>
        ))}
        <Pressable onPress={() => { setOpen(false); onOpenPet(pet); }} className="flex-row items-center justify-between mt-1 pt-2 px-2 border-t border-line active:opacity-70">
          <Text maxFontSizeMultiplier={1.1} className="text-[12px] font-bold text-primary" numberOfLines={1}>Open {pet.name}'s profile</Text>
          <Ionicons name="chevron-forward" size={14} color={colors.primary} />
        </Pressable>
      </Popover>

      {/* all four stats in one row (was a 2 x 2 grid) */}
      <View className="flex-row gap-1.5">
        {stats.map((s) => (
          <View key={s.label} className={cn('flex-1 rounded-2xl py-2 px-1 items-center', s.box)}>
            <View className="bg-white rounded-full">
              <ProgressRing color={s.fg} progress={s.progress} size={34} stroke={3.5}><Ionicons name={s.icon} size={14} color={s.fg} /></ProgressRing>
            </View>
            <Text maxFontSizeMultiplier={1.1} className="w-full text-center text-[12.5px] font-black text-ink mt-1.5" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{s.value}</Text>
            <Text maxFontSizeMultiplier={1.1} className="text-[10px] text-muted" numberOfLines={1}>{s.label}</Text>
            <Text maxFontSizeMultiplier={1.1} className="w-full text-center text-[9.5px] font-bold" style={{ color: s.fg }} numberOfLines={1}>{s.badge}</Text>
          </View>
        ))}
      </View>
    </Panel>
  );
}
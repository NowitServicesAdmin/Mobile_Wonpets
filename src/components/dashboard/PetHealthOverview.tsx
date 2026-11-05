import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';
import { Card, SectionHeader, T, cn } from '../ui';
import { formatApptDate } from '../appointments/AppointmentCard';
import PetAvatar from '../PetAvatar';
import ProgressRing from '../ProgressRing';
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
  const pet = pets.length ? pets[Math.min(idx, pets.length - 1)] : null;

  if (!pet) {
    return (
      <Card className="items-center py-8">
        <Ionicons name="medkit-outline" size={40} color="#FDBA74" />
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
    { label: 'Last Checkup', value: lastLabel, badge: lastVisit ? 'Up to Date' : 'No checkup', icon: 'calendar-outline', fg: colors.primary, box: 'bg-primary-soft', progress: lastVisit ? 1 : 0 },
  ];

  return (
    <Card className="border-orange-100">
      <SectionHeader
        title="Health Overview"
        subtitle="Your furry family at a glance"
        icon={<View className="w-10 h-10 rounded-full bg-cyan-100 items-center justify-center"><Ionicons name="medkit-outline" size={19} color="#0891B2" /></View>}
      />
      <View className="flex-row items-center gap-2 mb-3">
        <Pressable onPress={() => setIdx((i) => (i === 0 ? pets.length - 1 : i - 1))} className="w-9 h-9 rounded-full bg-orange-50 border border-orange-100 items-center justify-center">
          <Ionicons name="chevron-back" size={18} color={colors.primary} />
        </Pressable>
        <Pressable onPress={() => onOpenPet(pet)} className="flex-1 flex-row items-center gap-2.5 bg-orange-50 border border-orange-100 rounded-2xl px-3 py-2">
          <PetAvatar emoji={pet.emoji} image={pet.image} size={38} />
          <View className="flex-1">
            <Text maxFontSizeMultiplier={1.1} className="font-bold text-sm text-ink" numberOfLines={1}>{pet.name}</Text>
            <Text maxFontSizeMultiplier={1.1} className="text-xs text-muted" numberOfLines={1}>{pet.breed}</Text>
          </View>
        </Pressable>
        <Pressable onPress={() => setIdx((i) => (i === pets.length - 1 ? 0 : i + 1))} className="w-9 h-9 rounded-full bg-orange-50 border border-orange-100 items-center justify-center">
          <Ionicons name="chevron-forward" size={18} color={colors.primary} />
        </Pressable>
      </View>

      {/* 2 x 2 compact stat tiles: small ring + label on top, value, status pill */}
      <View className="flex-row flex-wrap gap-2.5">
        {stats.map((s) => (
          <View key={s.label} className={cn('w-[48.3%] rounded-2xl p-3', s.box)}>
            <View className="flex-row items-center gap-2">
              <View className="bg-white rounded-full">
                <ProgressRing color={s.fg} progress={s.progress} size={40} stroke={4}><Ionicons name={s.icon} size={16} color={s.fg} /></ProgressRing>
              </View>
              <Text maxFontSizeMultiplier={1.1} className="flex-1 text-xs font-semibold text-muted" numberOfLines={1}>{s.label}</Text>
            </View>
            <Text maxFontSizeMultiplier={1.1} className="text-[16px] font-black text-ink mt-2.5" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{s.value}</Text>
            <View className="self-start bg-white rounded-full px-2.5 py-0.5 mt-1.5">
              <Text maxFontSizeMultiplier={1.1} className="text-[11px] font-bold" style={{ color: s.fg }} numberOfLines={1}>{s.badge}</Text>
            </View>
          </View>
        ))}
      </View>
    </Card>
  );
}
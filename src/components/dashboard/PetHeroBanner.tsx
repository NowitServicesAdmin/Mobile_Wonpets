import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Gradient } from '../ui';
import PetAvatar from '../PetAvatar';
import type { Pet } from '../../data/mock';

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good Morning,' : h < 17 ? 'Good Afternoon,' : 'Good Evening,';
}

export type ApptStats = { upcoming: number; inProgress: number; completed: number; cancelled: number };

type Props = {
  userName?: string;
  pets: Pet[];
  stats: ApptStats;
  profileComplete?: boolean;
  profilePercent?: number;
  onProfile?: () => void;
};

const tiles: { k: keyof ApptStats; label: string; icon: keyof typeof Ionicons.glyphMap; box: string; fg: string }[] = [
  { k: 'upcoming', label: 'Upcoming', icon: 'time-outline', box: 'bg-orange-100', fg: '#F97316' },
  { k: 'inProgress', label: 'In Progress', icon: 'pulse-outline', box: 'bg-blue-100', fg: '#3B82F6' },
  { k: 'completed', label: 'Completed', icon: 'checkmark-circle-outline', box: 'bg-green-100', fg: '#22C55E' },
  { k: 'cancelled', label: 'Cancelled', icon: 'close-circle-outline', box: 'bg-red-100', fg: '#EF4444' },
];

/** Cream hero: greeting + tagline, rotating pet photo, and four appointment-count tiles. */
export default function PetHeroBanner({ userName, pets, stats, profileComplete = true, profilePercent = 0, onProfile }: Props) {
  const [idx, setIdx] = useState(0);
  const fade = useRef(new Animated.Value(1)).current;

  // rotate through pets every 5s, like the web hero
  useEffect(() => {
    if (pets.length <= 1) return;
    const id = setInterval(() => {
      Animated.timing(fade, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
        setIdx((i) => (i + 1) % pets.length);
        Animated.timing(fade, { toValue: 1, duration: 300, useNativeDriver: true }).start();
      });
    }, 5000);
    return () => clearInterval(id);
  }, [pets.length, fade]);

  const pet = pets.length ? pets[Math.min(idx, pets.length - 1)] : null;
  const firstName = (userName ?? 'there').trim().split(' ')[0];

  return (
    <Gradient colorsArr={['#FFEFCE', '#FFFFFF']} className="rounded-3xl p-3.5 border border-[#F2C46D] overflow-hidden">
      <View className="flex-row items-center gap-3">
        <View className="flex-1">
          <Text maxFontSizeMultiplier={1.1} className="text-[13px] font-semibold text-muted">{greeting()}</Text>
          <Text maxFontSizeMultiplier={1.1} className="text-[22px] font-black text-primary leading-7" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
            {firstName} 👋
          </Text>
          <Text maxFontSizeMultiplier={1.1} className="text-[12px] text-muted leading-4 mt-1" numberOfLines={2}>
            <Text className="text-green font-bold">{pet ? pet.name : 'Your pets'}</Text> — keep your pets healthy, happy and well-cared for 🧡
          </Text>
          {!profileComplete && !!onProfile && (
            <Pressable onPress={onProfile} className="self-start mt-2 bg-orange-100 rounded-full px-2.5 py-1 active:opacity-80">
              <Text maxFontSizeMultiplier={1.1} className="text-[11px] font-semibold text-primary">Profile {profilePercent}% · Complete in Settings</Text>
            </Pressable>
          )}
        </View>

        <Animated.View style={{ opacity: fade }} className="items-center">
          <View className="w-[80px] h-[80px] rounded-full bg-orange-300 items-center justify-center">
            <View className="w-[74px] h-[74px] rounded-full bg-white items-center justify-center">
              {pet ? <PetAvatar emoji={pet.emoji} image={pet.image} size={66} /> : <Ionicons name="paw" size={30} color="#FDBA74" />}
            </View>
          </View>
          <View className="-mt-2.5 bg-white rounded-full px-2.5 py-0.5 max-w-[92px] border border-line">
            <Text maxFontSizeMultiplier={1.1} className="text-[11px] font-extrabold text-primary" numberOfLines={1}>{pet ? pet.name : 'No pets yet'}</Text>
          </View>
        </Animated.View>
      </View>

      {/* appointment stats */}
      <View className="flex-row gap-1.5 mt-3">
        {tiles.map((t) => (
          <View key={t.k} className="flex-1 bg-white rounded-2xl border border-line px-1.5 py-2 items-center">
            <View className={`w-7 h-7 rounded-full items-center justify-center ${t.box}`}>
              <Ionicons name={t.icon} size={15} color={t.fg} />
            </View>
            <Text maxFontSizeMultiplier={1.1} className="text-[15px] font-black text-ink leading-5 mt-1">{stats[t.k]}</Text>
            <Text maxFontSizeMultiplier={1.1} className="text-[10px] text-muted" numberOfLines={1}>{t.label}</Text>
          </View>
        ))}
      </View>
    </Gradient>
  );
}
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';
import { Chip, Gradient, T } from '../ui';
import PetAvatar from '../PetAvatar';
import type { Pet } from '../../data/mock';

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good Morning,' : h < 17 ? 'Good Afternoon,' : 'Good Evening,';
}

type Props = { userName?: string; pets: Pet[]; profileComplete?: boolean; daysWithApp?: number };

export default function PetHeroBanner({ userName, pets, profileComplete = true, daysWithApp = 0 }: Props) {
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
  if (!pet) {
    return (
      <View className="rounded-3xl bg-white p-7 border border-line items-center">
        <Text className={T.body}>No pets available.</Text>
      </View>
    );
  }

  const firstName = (userName ?? 'there').trim().split(' ')[0];

  return (
    <Gradient colorsArr={['#FFEFCE', '#FFFFFF']} className="rounded-3xl p-4 border border-[#F2C46D] overflow-hidden">
      {/* top row: pet count + carousel dots */}
      <View className="flex-row items-center justify-between">
        <Chip label={`${pets.length} ${pets.length === 1 ? 'Pet' : 'Pets'} Registered`} tone="white" />
        {pets.length > 1 && (
          <View className="flex-row items-center gap-1.5">
            {pets.map((p, i) => (
              <View key={p.id} className={i === idx ? 'w-4 h-1.5 rounded-full bg-primary' : 'w-1.5 h-1.5 rounded-full bg-orange-200'} />
            ))}
          </View>
        )}
      </View>

      {/* greeting on the left, pet photo on the right */}
      <View className="flex-row items-center gap-3 mt-3.5">
        <View className="flex-1">
          <Text maxFontSizeMultiplier={1.1} className="text-[15px] font-semibold text-muted">{greeting()}</Text>
          <Text maxFontSizeMultiplier={1.1} className="text-[26px] font-black text-primary leading-8" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{firstName} 👋</Text>
          <Text maxFontSizeMultiplier={1.1} className="text-[13px] text-muted leading-[18px] mt-1.5" numberOfLines={3}>
            <Text className="text-green font-bold">{pet.name}</Text> — give your pets the best care and love they deserve. 🧡
          </Text>
        </View>

        <Animated.View style={{ opacity: fade }} className="items-center pb-3">
          <View className="rounded-full p-1 bg-orange-300">
            <View className="rounded-full bg-white p-1">
              <PetAvatar emoji={pet.emoji} image={pet.image} size={104} />
            </View>
          </View>
          <View className="absolute bottom-0 bg-white rounded-full px-3 py-1 flex-row items-center gap-1 border border-line">
            <Ionicons name="scale-outline" size={12} color={colors.primary} />
            <Text maxFontSizeMultiplier={1.1} className="text-primary font-extrabold text-xs">{pet.weight}</Text>
          </View>
          <Ionicons name="heart" size={14} color="#FDBA74" style={{ position: 'absolute', top: 0, left: -4 }} />
          <Ionicons name="heart" size={11} color="#FED7AA" style={{ position: 'absolute', top: 22, left: -12 }} />
        </Animated.View>
      </View>

      {/* quick stats */}
      <View className="flex-row bg-white rounded-2xl border border-line mt-3.5 py-3">
        <View className="flex-1 flex-row items-center justify-center gap-2.5 border-r border-line px-2">
          <View className="w-9 h-9 rounded-full bg-blue-soft items-center justify-center"><Ionicons name="checkmark-circle-outline" size={19} color={colors.blue} /></View>
          <View>
            <Text maxFontSizeMultiplier={1.1} className="font-extrabold text-ink text-[15px]">{profileComplete ? '100%' : '0%'}</Text>
            <Text maxFontSizeMultiplier={1.1} className="text-[11px] text-muted">Profile Complete</Text>
          </View>
        </View>
        <View className="flex-1 flex-row items-center justify-center gap-2.5 px-2">
          <View className="w-9 h-9 rounded-full bg-primary-soft items-center justify-center"><Ionicons name="star-outline" size={18} color={colors.primary} /></View>
          <View>
            <Text maxFontSizeMultiplier={1.1} className="font-extrabold text-ink text-[15px]">{daysWithApp}</Text>
            <Text maxFontSizeMultiplier={1.1} className="text-[11px] text-muted">Days with WonPet</Text>
          </View>
        </View>
      </View>
    </Gradient>
  );
}
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';
import { useSettings } from '../../context/SettingsContext';
import { formatIsoDate } from '../../utils/petAge';

/** Shown at the top of every role's home screen once a paid plan has ended. It stays until a new plan is bought and
 *  takes the user straight to the Subscription page (`onRenew` opens it in that role's Profile tab). */
export default function PlanEndedBanner({ onRenew }: { onRenew: () => void }) {
  const { ready, subscription, expiredPlan, plans } = useSettings();
  if (!ready || subscription || !expiredPlan) return null;
  const name = plans.find((p) => p.id === expiredPlan.planId)?.name ?? expiredPlan.planId;
  return (
    <Pressable onPress={onRenew} accessibilityRole="button" accessibilityLabel="Plan ended. Renew now" className="rounded-3xl border border-red/30 bg-red-soft p-4 gap-3 active:opacity-90">
      <View className="flex-row items-center gap-3">
        <View className="w-10 h-10 rounded-xl bg-white items-center justify-center"><Ionicons name="alert-circle" size={22} color={colors.red} /></View>
        <View className="flex-1">
          <Text maxFontSizeMultiplier={1.1} className="text-[15px] font-extrabold text-ink">Your {name} plan has ended</Text>
          <Text maxFontSizeMultiplier={1.1} className="text-[12px] text-muted">It ended on {formatIsoDate(expiredPlan.endedOn)}. Choose a plan to continue.</Text>
        </View>
      </View>
      <View className="self-start flex-row items-center gap-1.5 bg-red rounded-full px-4 py-2">
        <Text maxFontSizeMultiplier={1.1} className="text-white font-extrabold text-[13px]">Renew now</Text>
        <Ionicons name="arrow-forward" size={14} color="#fff" />
      </View>
    </Pressable>
  );
}

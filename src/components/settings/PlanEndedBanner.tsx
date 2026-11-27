import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';
import { cn } from '../ui';
import { useSettings } from '../../context/SettingsContext';
import { formatIsoDate } from '../../utils/petAge';

// Banners closed with the X stay closed until the app restarts. The key includes the state and its date, so the next
// stage (e.g. grace -> paused) shows again.
const dismissed = new Set<string>();
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;

/** Renewal reminder at the top of every role's home screen (`onRenew` opens that role's Subscription page):
 *  - expiring : the paid plan ends within a few days (yellow, can be closed)
 *  - grace    : it has ended but everything still works for a few days (yellow, can be closed)
 *  - paused   : the grace period is over - data is kept, nothing new can be added (red, stays until renewed)
 *  The account is never moved to the free plan; this banner (plus push / in-app reminders) asks the user to renew. */
export default function PlanEndedBanner({ onRenew }: { onRenew: () => void }) {
  const { ready, subscription: sub, expiredPlan: ended, plans } = useSettings();
  const [, force] = useState(0);
  if (!ready) return null;

  const planId = ended?.planId ?? sub?.planId;
  const name = plans.find((p) => p.id === planId)?.name ?? planId ?? '';
  let state: 'expiring' | 'grace' | 'paused' | null = null;
  let title = '';
  let body = '';
  let key = '';
  if (ended?.state === 'paused') {
    state = 'paused'; key = `paused:${ended.endedOn}`;
    title = 'Your account is paused';
    body = `Your ${name} plan ended on ${formatIsoDate(ended.endedOn)}. Your data is safe - renew to add new items again.`;
  } else if (ended?.state === 'grace') {
    state = 'grace'; key = `grace:${ended.endedOn}`;
    title = `Your ${name} plan has ended`;
    body = `Everything keeps working for ${plural(ended.graceDaysLeft, 'more day')}. Renew before ${formatIsoDate(ended.graceEndsOn)} to avoid a pause.`;
  } else if (sub?.state === 'expiring' && !sub.cancelled) {
    state = 'expiring'; key = `expiring:${sub.renewsOn}`;
    title = sub.daysLeft <= 1 ? `Your ${name} plan ends tomorrow` : `Your ${name} plan ends in ${plural(sub.daysLeft, 'day')}`;
    body = `Renew now - the new period starts on ${formatIsoDate(sub.renewsOn)}, so you don't lose any days.`;
  }
  if (!state || dismissed.has(key)) return null;

  const red = state === 'paused';
  return (
    <Pressable onPress={onRenew} accessibilityRole="button" accessibilityLabel={`${title}. Renew now`} className={cn('rounded-3xl border p-4 gap-3 active:opacity-90', red ? 'border-red/30 bg-red-soft' : 'border-yellow/40 bg-yellow-soft')}>
      <View className="flex-row items-center gap-3">
        <View className="w-10 h-10 rounded-xl bg-white items-center justify-center">
          <Ionicons name={red ? 'pause-circle' : 'time'} size={22} color={red ? colors.red : colors.yellow} />
        </View>
        <View className="flex-1">
          <Text maxFontSizeMultiplier={1.1} className="text-[15px] font-extrabold text-ink">{title}</Text>
          <Text maxFontSizeMultiplier={1.1} className="text-[12px] text-muted">{body}</Text>
        </View>
        {!red && (
          <Pressable hitSlop={10} accessibilityLabel="Dismiss reminder" onPress={() => { dismissed.add(key); force((n) => n + 1); }} className="w-7 h-7 rounded-full items-center justify-center active:opacity-60">
            <Ionicons name="close" size={18} color={colors.muted} />
          </Pressable>
        )}
      </View>
      <View className={cn('self-start flex-row items-center gap-1.5 rounded-full px-4 py-2', red ? 'bg-red' : 'bg-primary')}>
        <Text maxFontSizeMultiplier={1.1} className="text-white font-extrabold text-[13px]">Renew now</Text>
        <Ionicons name="arrow-forward" size={14} color="#fff" />
      </View>
    </Pressable>
  );
}

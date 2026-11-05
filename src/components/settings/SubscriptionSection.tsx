import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';
import { Button, Chip, T, cn } from '../ui';
import { WonPetsAlert, toast } from '../WonPetsAlert';
import { Plan } from '../../data/settings';
import { useSettings } from '../../context/SettingsContext';
import { errorMessage } from '../../services/api';
import { formatIsoDate } from '../../utils/petAge';
import { inr } from '../../utils/orders';

const planBg: Record<string, string> = { basic: 'bg-sky-400', pro: 'bg-purple', premium: 'bg-primary' };

/** Plans and the current subscription come from the backend. Cancel / restore are live. */
export default function SubscriptionSection() {
  const { plans, yearlySaving, subscription: sub, cancelPlan, restorePlan } = useSettings();
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly');
  const [busy, setBusy] = useState(false);

  const yearly = (m: number) => Math.round((m * 12 * (1 - yearlySaving / 100)) / 10) * 10; // same rounding as the server
  const free = plans.find((p) => p.monthly === 0) || plans[0];
  // no active paid subscription on the server = the free plan
  const current: Plan | undefined = (sub && plans.find((p) => p.id === sub.planId)) || free;
  if (!current) return <Text className={T.small}>Plans are not available right now.</Text>;
  const onPaid = !!sub && current.monthly > 0;
  const cancelled = !!sub?.cancelled;
  const paidActive = onPaid && !cancelled; // other plans stay locked until the current one is cancelled

  const run = async (fn: () => Promise<void>, ok: string) => {
    setBusy(true);
    try { await fn(); toast.success(ok); } catch (e) { WonPetsAlert.error('Something went wrong', errorMessage(e)); } finally { setBusy(false); }
  };
  const onCancel = async () => {
    const r = await WonPetsAlert.confirm('Cancel your plan?', `You keep ${current.name} benefits until ${formatIsoDate(sub!.renewsOn)}. It will not renew.`, { confirmText: 'Cancel plan', cancelText: 'Keep plan' });
    if (r.isConfirmed) run(cancelPlan, 'Plan cancelled. It will not renew.');
  };
  const onBuy = (p: Plan) => {
    if (p.monthly === 0) return WonPetsAlert.info('Free plan', 'Cancel your current plan and you will move to the free plan when it ends.');
    // Payment gateway is not connected on mobile yet. When it is: settingsService.initiateSubscription -> payWithRazorpay -> settingsService.activateSubscription.
    WonPetsAlert.info('Online payment coming soon', `${p.name} can be purchased from the WONPET website for now. In-app payment will be available soon.`);
  };

  return (
    <View className="gap-3.5">
      <View className="rounded-2xl border border-purple/30 bg-purple-soft/60 p-3.5 gap-1.5">
        <View className="flex-row items-center gap-2.5"><Text className="text-3xl">{current.emoji}</Text><View className="flex-1"><Text className={T.h3}>{current.name} plan</Text><Text className={T.small}>{!onPaid ? 'Free forever' : sub!.billing === 'yearly' ? 'Billed yearly' : 'Billed monthly'}</Text></View>{cancelled ? <Chip label="Cancelled" tone="red" /> : <Chip label="Active" tone="green" />}</View>
        {onPaid && <Text className={T.small}>{cancelled ? `Access until ${formatIsoDate(sub!.renewsOn)}` : `Renews on ${formatIsoDate(sub!.renewsOn)}`}</Text>}
        {onPaid && (cancelled
          ? <Button disabled={busy} className="mt-1.5 py-2.5" title="Restore plan" onPress={() => run(restorePlan, 'Plan restored')} />
          : <Pressable disabled={busy} onPress={onCancel}><Text className="text-red font-bold text-xs mt-1">Cancel plan</Text></Pressable>)}
      </View>

      <View className="flex-row self-center bg-white rounded-full p-1 border border-line">
        {(['monthly', 'yearly'] as const).map((b) => (
          <Pressable key={b} onPress={() => setBilling(b)} className={cn('px-5 py-2 rounded-full flex-row items-center gap-1.5', billing === b && 'bg-purple')}>
            <Text className={cn('font-extrabold capitalize', billing === b ? 'text-white' : 'text-ink')}>{b}</Text>
            {b === 'yearly' && yearlySaving > 0 && <Text className={cn('text-[10px] font-bold', billing === b ? 'text-white' : 'text-green')}>Save {yearlySaving}%</Text>}
          </Pressable>
        ))}
      </View>

      {plans.map((p) => {
        const owned = p.id === current.id;
        const isFree = p.monthly === 0;
        const locked = !owned && paidActive;
        const label = owned ? 'Current Plan' : locked ? 'Cancel current plan first' : `Switch to ${p.name}`;
        return (
          <View key={p.id} className={cn('bg-white rounded-3xl p-4 gap-2 border', owned ? 'border-2 border-purple' : 'border-line')}>
            <View className="flex-row items-center gap-2.5">
              <Text className="text-[34px]">{p.emoji}</Text><Text className={cn(T.h2, 'flex-1')}>{p.name}</Text>
              <View style={{ backgroundColor: p.color }} className="px-2.5 py-1.5 rounded-lg"><Text className="text-white font-extrabold text-xs">{isFree ? 'FREE' : `${inr(billing === 'yearly' ? yearly(p.monthly) : p.monthly)}/${billing === 'yearly' ? 'year' : 'month'}`}</Text></View>
            </View>
            {p.features.map((f) => <View key={f} className="flex-row gap-2 items-center"><Ionicons name="checkmark" size={16} color={colors.green} /><Text className={T.body}>{f}</Text></View>)}
            <Button title={label} disabled={owned || locked || busy} className={!owned && !locked ? planBg[p.id] : undefined} onPress={() => onBuy(p)} />
          </View>
        );
      })}
    </View>
  );
}

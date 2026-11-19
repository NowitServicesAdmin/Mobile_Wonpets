import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';
import { Button, Chip, T, cn } from '../ui';
import { WonPetsAlert, toast } from '../WonPetsAlert';
import { Plan } from '../../data/settings';
import { useSettings } from '../../context/SettingsContext';
import { errorMessage } from '../../services/api';
import { PaymentCancelled } from '../../utils/razorpay';
import { formatIsoDate } from '../../utils/petAge';
import { inr } from '../../utils/orders';

const planBg: Record<string, string> = { basic: 'bg-sky-400', pro: 'bg-purple', premium: 'bg-primary' };

/** Plans and the current subscription come from the backend. Buy (Razorpay), cancel and restore are live. */
export default function SubscriptionSection() {
  const { plans, yearlySaving, subscription: sub, expiredPlan, cancelPlan, restorePlan, buyPlan } = useSettings();
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly');
  const [busy, setBusy] = useState(false);

  const yearly = (m: number) => Math.round((m * 12 * (1 - yearlySaving / 100)) / 10) * 10; // same rounding as the server
  const free = plans.find((p) => p.monthly === 0);
  // A running plan is the current one - even if it has since been removed from the catalogue (shown by its stored name).
  // With no running plan there is NO fallback: a never-subscribed account sits on the free plan, an account whose plan
  // ended has no active plan until it picks a new one.
  const ended = !sub && !!expiredPlan;
  const current: Plan | undefined = sub
    ? plans.find((p) => p.id === sub.planId) ?? { id: sub.planId, name: sub.planId.charAt(0).toUpperCase() + sub.planId.slice(1), emoji: '🐾', monthly: 0, features: [], color: '#7C3AED' }
    : ended ? undefined : free;
  if (!current && !plans.length) return <Text className={T.small}>Plans are not available right now.</Text>;
  const onPaid = !!sub; // a subscription record only ever exists for a paid plan
  const cancelled = !!sub?.cancelled;
  const paidActive = onPaid && !cancelled; // other plans stay locked until the current one is cancelled

  const run = async (fn: () => Promise<void>, ok: string) => {
    setBusy(true);
    try { await fn(); toast.success(ok); } catch (e) { WonPetsAlert.error('Something went wrong', errorMessage(e)); } finally { setBusy(false); }
  };
  const onCancel = async () => {
    const r = await WonPetsAlert.confirm('Cancel your plan?', `You keep ${current!.name} benefits until ${formatIsoDate(sub!.renewsOn)}. It will not renew.`, { confirmText: 'Cancel plan', cancelText: 'Keep plan' });
    if (r.isConfirmed) run(cancelPlan, 'Plan cancelled. It will not renew.');
  };
  const onBuy = async (p: Plan) => {
    if (p.monthly === 0) return WonPetsAlert.info('Free plan', 'Cancel your current plan and you will move to the free plan when it ends.');
    if (busy) return;
    const price = billing === 'yearly' ? yearly(p.monthly) : p.monthly;
    setBusy(true);
    try {
      await buyPlan(p, billing);
      WonPetsAlert.success('Plan activated', `You are now on the ${p.name} plan (${inr(price)}/${billing === 'yearly' ? 'year' : 'month'}).`);
    } catch (e) {
      if (e instanceof PaymentCancelled) toast.info('Payment cancelled - your plan was not changed.');
      else WonPetsAlert.error('Payment failed', errorMessage(e, 'Could not complete the payment. If money was deducted, please contact support with your payment ID.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View className="gap-3.5">
      {!current ? (
        <View className="rounded-2xl border border-red/30 bg-red-soft p-3.5 flex-row gap-2.5 items-center">
          <Ionicons name="alert-circle" size={24} color={colors.red} />
          <View className="flex-1">
            <Text className={T.h3}>{ended ? 'Your plan has ended' : 'No active plan'}</Text>
            <Text className={T.small}>{ended ? `Your ${plans.find((p) => p.id === expiredPlan!.planId)?.name ?? expiredPlan!.planId} plan ended on ${formatIsoDate(expiredPlan!.endedOn)}. Choose a plan below to continue.` : 'Choose a plan below to get started.'}</Text>
          </View>
        </View>
      ) : (
      <View className="rounded-2xl border border-purple/30 bg-purple-soft/60 p-3.5 gap-1.5">
        <View className="flex-row items-center gap-2.5"><Text className="text-3xl">{current.emoji}</Text><View className="flex-1"><Text className={T.h3}>{current.name} plan</Text><Text className={T.small}>{!onPaid ? 'Free forever' : sub!.billing === 'yearly' ? 'Billed yearly' : 'Billed monthly'}</Text></View>{cancelled ? <Chip label="Cancelled" tone="red" /> : <Chip label="Active" tone="green" />}</View>
        {onPaid && <Text className={T.small}>{cancelled ? `Access until ${formatIsoDate(sub!.renewsOn)}` : `Renews on ${formatIsoDate(sub!.renewsOn)}`}</Text>}
        {onPaid && (cancelled
          ? <Button disabled={busy} className="mt-1.5 py-2.5" title="Restore plan" onPress={() => run(restorePlan, 'Plan restored')} />
          : <Pressable disabled={busy} onPress={onCancel}><Text className="text-red font-bold text-xs mt-1">Cancel plan</Text></Pressable>)}
      </View>
      )}

      <View className="flex-row self-center bg-white rounded-full p-1 border border-line">
        {(['monthly', 'yearly'] as const).map((b) => (
          <Pressable key={b} onPress={() => setBilling(b)} className={cn('px-5 py-2 rounded-full flex-row items-center gap-1.5', billing === b && 'bg-purple')}>
            <Text className={cn('font-extrabold capitalize', billing === b ? 'text-white' : 'text-ink')}>{b}</Text>
            {b === 'yearly' && yearlySaving > 0 && <Text className={cn('text-[10px] font-bold', billing === b ? 'text-white' : 'text-green')}>Save {yearlySaving}%</Text>}
          </Pressable>
        ))}
      </View>

      {plans.map((p) => {
        const owned = p.id === current?.id;
        const isFree = p.monthly === 0;
        const locked = !owned && paidActive;
        const freeBlocked = isFree && ended; // an ended plan does not fall back to free - a new plan has to be chosen
        const label = owned ? 'Current Plan' : freeBlocked ? 'Choose a paid plan' : locked ? 'Cancel current plan first' : `Switch to ${p.name}`;
        return (
          <View key={p.id} className={cn('bg-white rounded-3xl p-4 gap-2 border', owned ? 'border-2 border-purple' : 'border-line')}>
            <View className="flex-row items-center gap-2.5">
              <Text className="text-[34px]">{p.emoji}</Text><Text className={cn(T.h2, 'flex-1')}>{p.name}</Text>
              <View style={{ backgroundColor: p.color }} className="px-2.5 py-1.5 rounded-lg"><Text className="text-white font-extrabold text-xs">{isFree ? 'FREE' : `${inr(billing === 'yearly' ? yearly(p.monthly) : p.monthly)}/${billing === 'yearly' ? 'year' : 'month'}`}</Text></View>
            </View>
            {p.features.map((f) => <View key={f} className="flex-row gap-2 items-center"><Ionicons name="checkmark" size={16} color={colors.green} /><Text className={T.body}>{f}</Text></View>)}
            <Button title={label} disabled={owned || locked || freeBlocked || busy} className={!owned && !locked ? planBg[p.id] : undefined} onPress={() => onBuy(p)} />
          </View>
        );
      })}
    </View>
  );
}
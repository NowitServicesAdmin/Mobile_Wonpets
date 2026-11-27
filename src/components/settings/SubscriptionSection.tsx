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
import PlanUsageCard from './PlanUsageCard';

const planBg: Record<string, string> = { basic: 'bg-sky-400', pro: 'bg-purple', premium: 'bg-primary' };
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;

/**
 * How plans work (the server enforces every rule here - this screen only explains them):
 *  - active    : the paid plan is running. Other plans stay locked until it is cancelled (prepaid, no refund).
 *  - expiring  : it ends within a few days. "Renew" adds a new period on top, so no days are lost.
 *  - grace     : the end date has passed but everything still works for a few more days. Renewing keeps the original date.
 *  - paused    : the grace period is over. All data is kept, but nothing new can be added until the plan is renewed.
 * An account that had a paid plan is never moved to the free plan - it is reminded to renew instead.
 */
export default function SubscriptionSection() {
  const { plans, yearlySaving, subscription: sub, expiredPlan: ended, cancelPlan, restorePlan, buyPlan } = useSettings();
  const [billing, setBilling] = useState<'monthly' | 'yearly'>(sub?.billing ?? ended?.billing ?? 'monthly');
  const [busy, setBusy] = useState(false);

  const yearly = (m: number) => Math.round((m * 12 * (1 - yearlySaving / 100)) / 10) * 10; // same rounding as the server
  const free = plans.find((p) => p.monthly === 0);
  const paidId = sub?.planId ?? ended?.planId;
  // the paid plan on record - even if it has since been removed from the catalogue (shown by its stored name)
  const paidPlan: Plan | undefined = paidId
    ? plans.find((p) => p.id === paidId) ?? { id: paidId, name: paidId.charAt(0).toUpperCase() + paidId.slice(1), emoji: '🐾', monthly: 0, features: [], color: '#7C3AED' }
    : undefined;
  if (!paidPlan && !plans.length) return <Text className={T.small}>Plans are not available right now.</Text>;

  const cancelled = !!sub?.cancelled;
  const running = !!sub; // active or expiring
  const lockedBySub = running && !cancelled; // other plans stay locked until the current one is cancelled
  const hadPaid = !!paidPlan; // once a paid plan was bought, the free plan is not offered again
  const renewable = (sub?.canRenew ?? false) || !!ended;

  const run = async (fn: () => Promise<void>, ok: string) => {
    setBusy(true);
    try { await fn(); toast.success(ok); } catch (e) { WonPetsAlert.error('Something went wrong', errorMessage(e)); } finally { setBusy(false); }
  };
  const onCancel = async () => {
    const r = await WonPetsAlert.confirm(
      'Cancel your plan?',
      `You keep every ${paidPlan!.name} benefit until ${formatIsoDate(sub!.renewsOn)}. No refund is issued, and you can restore it any time before then.`,
      { confirmText: 'Cancel plan', cancelText: 'Keep plan' },
    );
    if (r.isConfirmed) run(cancelPlan, 'Plan cancelled. You keep access until it ends.');
  };
  const pay = async (p: Plan, cycle: 'monthly' | 'yearly', renewal: boolean) => {
    if (busy || p.monthly === 0) return;
    const price = cycle === 'yearly' ? yearly(p.monthly) : p.monthly;
    setBusy(true);
    try {
      await buyPlan(p, cycle);
      WonPetsAlert.success(
        renewal ? 'Plan renewed' : 'Plan activated',
        renewal ? `Your ${p.name} plan is renewed (${inr(price)}/${cycle === 'yearly' ? 'year' : 'month'}).` : `You are now on the ${p.name} plan (${inr(price)}/${cycle === 'yearly' ? 'year' : 'month'}).`,
      );
    } catch (e) {
      if (e instanceof PaymentCancelled) toast.info('Payment cancelled - your plan was not changed.');
      else WonPetsAlert.error('Payment failed', errorMessage(e, 'Could not complete the payment. If money was deducted, please contact support with your payment ID.'));
    } finally {
      setBusy(false);
    }
  };
  const renewTitle = paidPlan ? `Renew ${paidPlan.name} · ${inr(billing === 'yearly' ? yearly(paidPlan.monthly) : paidPlan.monthly)}/${billing === 'yearly' ? 'yr' : 'mo'}` : '';

  return (
    <View className="gap-3.5">
      {/* ---------- status card ---------- */}
      {ended ? (
        <View className={cn('rounded-2xl border p-3.5 gap-2', ended.state === 'paused' ? 'border-red/30 bg-red-soft' : 'border-yellow/40 bg-yellow-soft')}>
          <View className="flex-row gap-2.5 items-center">
            <Ionicons name={ended.state === 'paused' ? 'pause-circle' : 'time'} size={26} color={ended.state === 'paused' ? colors.red : colors.yellow} />
            <View className="flex-1">
              <Text className={T.h3}>{ended.state === 'paused' ? 'Your account is paused' : `Your ${paidPlan!.name} plan has ended`}</Text>
              <Text className={T.small}>
                {ended.state === 'paused'
                  ? `Your ${paidPlan!.name} plan ended on ${formatIsoDate(ended.endedOn)}. Your pets and records are safe, but you can't add anything new until you renew.`
                  : `It ended on ${formatIsoDate(ended.endedOn)}. Everything keeps working until ${formatIsoDate(ended.graceEndsOn)} (${plural(ended.graceDaysLeft, 'day')} left). Renew to avoid a pause.`}
              </Text>
            </View>
          </View>
          {ended.state === 'grace' && <Text className={T.small}>Renewing now keeps your original billing date ({formatIsoDate(ended.endedOn)}).</Text>}
          {paidPlan!.monthly > 0 && <Button disabled={busy} className="py-2.5" title={renewTitle} onPress={() => pay(paidPlan!, billing, true)} />}
        </View>
      ) : sub ? (
        <View className={cn('rounded-2xl border p-3.5 gap-1.5', sub.state === 'expiring' && !cancelled ? 'border-yellow/40 bg-yellow-soft' : 'border-purple/30 bg-purple-soft/60')}>
          <View className="flex-row items-center gap-2.5">
            <Text className="text-3xl">{paidPlan!.emoji}</Text>
            <View className="flex-1"><Text className={T.h3}>{paidPlan!.name} plan</Text><Text className={T.small}>{sub.billing === 'yearly' ? 'Billed yearly' : 'Billed monthly'} · prepaid</Text></View>
            {cancelled ? <Chip label="Cancelled" tone="red" /> : sub.state === 'expiring' ? <Chip label={`Ends in ${plural(sub.daysLeft, 'day')}`} tone="yellow" /> : <Chip label="Active" tone="green" />}
          </View>
          <Text className={T.small}>
            {cancelled
              ? `Access until ${formatIsoDate(sub.renewsOn)}. No refund is issued, but you can restore it any time before then.`
              : sub.state === 'expiring'
                ? `Valid until ${formatIsoDate(sub.renewsOn)}. Renew now - the new period starts when this one ends, so you don't lose any days.`
                : `Valid until ${formatIsoDate(sub.renewsOn)}.`}
          </Text>
          {!cancelled && sub.canRenew && paidPlan!.monthly > 0 && <Button disabled={busy} className="mt-1.5 py-2.5" title={renewTitle} onPress={() => pay(paidPlan!, billing, true)} />}
          {cancelled
            ? <Button disabled={busy} className="mt-1.5 py-2.5" title="Restore plan" onPress={() => run(restorePlan, 'Plan restored')} />
            : <Pressable disabled={busy} onPress={onCancel}><Text className="text-red font-bold text-xs mt-1">Cancel plan</Text></Pressable>}
        </View>
      ) : free ? (
        <View className="rounded-2xl border border-purple/30 bg-purple-soft/60 p-3.5 flex-row items-center gap-2.5">
          <Text className="text-3xl">{free.emoji}</Text>
          <View className="flex-1"><Text className={T.h3}>{free.name} plan</Text><Text className={T.small}>Free forever. Upgrade any time for more.</Text></View>
          <Chip label="Active" tone="green" />
        </View>
      ) : null}

      <PlanUsageCard />

      {/* ---------- billing toggle ---------- */}
      <View className="flex-row self-center bg-white rounded-full p-1 border border-line">
        {(['monthly', 'yearly'] as const).map((b) => (
          <Pressable key={b} onPress={() => setBilling(b)} className={cn('px-5 py-2 rounded-full flex-row items-center gap-1.5', billing === b && 'bg-purple')}>
            <Text className={cn('font-extrabold capitalize', billing === b ? 'text-white' : 'text-ink')}>{b}</Text>
            {b === 'yearly' && yearlySaving > 0 && <Text className={cn('text-[10px] font-bold', billing === b ? 'text-white' : 'text-green')}>Save {yearlySaving}%</Text>}
          </Pressable>
        ))}
      </View>

      {/* ---------- plan cards ---------- */}
      {plans.map((p) => {
        const isFree = p.monthly === 0;
        const mine = p.id === paidId;
        const onFree = !hadPaid && isFree; // never bought a paid plan
        let label: string;
        let enabled = false;
        let renewal = false;
        if (isFree) label = onFree ? 'Current Plan' : 'Not available after a paid plan';
        else if (mine && renewable) { label = ended ? `Renew ${p.name}` : 'Renew now'; enabled = !cancelled || !!ended; renewal = true; }
        else if (mine) label = 'Current Plan';
        else if (lockedBySub) label = 'Cancel current plan first';
        else { label = running || ended ? `Switch to ${p.name}` : `Choose ${p.name}`; enabled = true; }
        if (mine && cancelled && !ended) { label = 'Current Plan'; enabled = false; renewal = false; }
        const current = mine || onFree;
        return (
          <View key={p.id} className={cn('bg-white rounded-3xl p-4 gap-2 border', current ? 'border-2 border-purple' : 'border-line')}>
            <View className="flex-row items-center gap-2.5">
              <Text className="text-[34px]">{p.emoji}</Text><Text className={cn(T.h2, 'flex-1')}>{p.name}</Text>
              <View style={{ backgroundColor: p.color }} className="px-2.5 py-1.5 rounded-lg"><Text className="text-white font-extrabold text-xs">{isFree ? 'FREE' : `${inr(billing === 'yearly' ? yearly(p.monthly) : p.monthly)}/${billing === 'yearly' ? 'year' : 'month'}`}</Text></View>
            </View>
            {p.features.map((f) => <View key={f} className="flex-row gap-2 items-center"><Ionicons name="checkmark" size={16} color={colors.green} /><Text className={T.body}>{f}</Text></View>)}
            <Button title={busy && enabled ? 'Please wait...' : label} disabled={!enabled || busy} className={enabled ? planBg[p.id] : undefined} onPress={() => pay(p, billing, renewal)} />
          </View>
        );
      })}

      <Text className={cn(T.small, 'text-center')}>Plans are prepaid and non-refundable. When a plan ends you get a short grace period with full access and reminders - nothing is deleted.</Text>
    </View>
  );
}

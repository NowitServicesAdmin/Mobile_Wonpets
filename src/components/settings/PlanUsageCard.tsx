import React from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';
import { Chip, T, cn } from '../ui';
import { useSettings } from '../../context/SettingsContext';
import type { LimitDef } from '../../data/settings';

/** null / missing = unlimited (same rule as the server). */
const capOf = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

function Meter({ def, limit, used, over, paused }: { def: LimitDef; limit: number | null; used: number; over: boolean; paused: boolean }) {
  const unlimited = limit === null;
  const pct = unlimited ? 0 : limit === 0 ? 100 : Math.min(100, Math.round((used / limit) * 100));
  const full = !unlimited && used >= (limit as number);
  const bar = paused ? 'bg-muted' : over || full ? 'bg-red' : pct >= 80 ? 'bg-yellow' : 'bg-green';
  const right = paused ? `${used} · Renew to add` : unlimited ? `${used} used · Unlimited` : limit === 0 ? 'Not included' : `${used} / ${limit}`;
  return (
    <View className="bg-white rounded-2xl border border-line p-3 gap-2">
      <View className="flex-row items-center justify-between gap-2">
        <Text className="text-[13px] font-bold text-ink flex-1" numberOfLines={2}>{def.label}</Text>
        <Text className="text-xs font-semibold text-muted">{right}</Text>
      </View>
      {!unlimited && !paused && (
        <View className="h-1.5 w-full rounded-full bg-line overflow-hidden">
          <View className={cn('h-full rounded-full', bar)} style={{ width: `${pct}%` }} />
        </View>
      )}
      {over && !paused && <Text className="text-[11px] font-semibold text-red">You are over this limit. Existing items stay, but you can't add new ones until you upgrade or free up space.</Text>}
    </View>
  );
}

function Feature({ def, value, paused }: { def: LimitDef; value: unknown; paused: boolean }) {
  const on = !paused && (def.type === 'choice' ? value !== def.options?.[0] : value !== false);
  const text = paused ? 'Paused' : def.type === 'choice' ? String(value ?? def.options?.[def.options.length - 1] ?? '') : on ? 'Included' : 'Not included';
  return (
    <View className="bg-white rounded-2xl border border-line p-3 flex-row items-center justify-between gap-2">
      <Text className="text-[13px] font-bold text-ink flex-1" numberOfLines={2}>{def.label}</Text>
      <View className="flex-row items-center gap-1">
        <Ionicons name={on ? 'checkmark-circle' : 'lock-closed'} size={14} color={on ? colors.green : colors.muted} />
        <Text className={cn('text-xs font-semibold capitalize', on ? 'text-green' : 'text-muted')}>{text}</Text>
      </View>
    </View>
  );
}

/** What the current plan allows and how much has been used - driven entirely by GET /subscriptions/limits, so a new limit
 *  added on the server shows up here without an app update. */
export default function PlanUsageCard() {
  const { limits: data } = useSettings();
  if (!data || !data.defs.length) return null;
  const paused = data.planState === 'paused';
  const counts = data.defs.filter((d) => d.type === 'count' && d.key in data.usage);
  const features = data.defs.filter((d) => d.type !== 'count');

  return (
    <View className="rounded-3xl border border-line bg-cream p-3.5 gap-2.5">
      <View className="flex-row items-center justify-between gap-2">
        <View className="flex-1">
          <Text className={T.h3}>Your plan limits</Text>
          <Text className={T.small}>{data.planName ? `${data.planName}${data.isFreePlan ? ' (free)' : ''}${paused ? ' · paused' : data.planState === 'grace' ? ' · grace period' : ''}` : 'No plan configured'}</Text>
        </View>
        {paused ? <Chip label="Paused" tone="red" /> : data.overLimit.length > 0 ? <Chip label="Over limit" tone="red" /> : null}
      </View>
      {counts.map((d) => (
        <Meter key={d.key} def={d} limit={capOf(data.limits[d.key])} used={Number(data.usage[d.key] || 0)} over={data.overLimit.includes(d.key)} paused={paused} />
      ))}
      {features.map((d) => <Feature key={d.key} def={d} value={data.limits[d.key]} paused={paused} />)}
    </View>
  );
}

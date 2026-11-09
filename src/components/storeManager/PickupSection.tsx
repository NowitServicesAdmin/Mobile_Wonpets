import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';
import { WonPetsAlert } from '../WonPetsAlert';
import { FormSkeleton } from '../Skeletons';
import { FormCard, Notice } from '../doctor/ProfileBits';
import { Badge } from './SMUI';
import { errorMessage } from '../../services/api';
import { Pickup, smService } from '../../services/storeManager.service';

export const PICKUP_STATUS: Record<Pickup['status'], { label: string; tone: 'slate' | 'amber' | 'green' | 'red' }> = {
  not_set: { label: 'No address', tone: 'slate' },
  not_synced: { label: 'Saved', tone: 'slate' },
  pending_verification: { label: 'Awaiting verification', tone: 'amber' },
  active: { label: 'Ready for pickups', tone: 'green' },
  failed: { label: 'Rejected', tone: 'red' },
};

/** Courier pickup (web PickupAddressSection). Read-only: the address comes from Store details. */
export default function PickupSection({ onOpenStore, onStatus }: { onOpenStore: () => void; onStatus?: (s: Pickup['status']) => void }) {
  const [p, setP] = useState<Pickup | null>(null);
  const [failed, setFailed] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const apply = (x: Pickup) => { setP(x); onStatus?.(x.status); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { smService.pickup().then(apply).catch(() => setFailed(true)); }, []);

  const sync = async () => {
    setSyncing(true);
    try { apply(await smService.syncPickup()); } catch (e) { WonPetsAlert.error('Refresh failed', errorMessage(e, 'Try again')); } finally { setSyncing(false); }
  };

  if (failed && !p) return <FormCard icon="cube-outline" title="Courier pickup"><Text className="text-sm text-muted">Could not load the pickup status. Pull down later to try again.</Text></FormCard>;
  if (!p) return <FormCard icon="cube-outline" title="Courier pickup"><FormSkeleton fields={2} /></FormCard>;
  const st = PICKUP_STATUS[p.status] ?? PICKUP_STATUS.not_set;

  return (
    <View className="gap-3.5">
      <FormCard icon="cube-outline" title="Courier pickup" right={<Badge label={st.label} tone={st.tone} />}>
        <Text className="text-[13px] text-muted leading-5">
          Couriers collect your parcels from the store address in <Text onPress={onOpenStore} className="text-primary font-bold">Store details</Text>. There's nothing to enter here — change it there and this updates by itself.
        </Text>
        {!p.addressComplete && <Notice tone="warning">Your store address is incomplete. Pick your store location in Store details (address, city, state and a 6-digit pincode are needed), then save.</Notice>}
        {!p.shippingEnabled && <Notice tone="info">Courier delivery isn't switched on yet. You deliver orders yourself until it is.</Notice>}
        {!!p.lines && (
          <View className="rounded-2xl bg-cream border border-line px-3.5 py-3">
            {!!p.contact && <Text className="font-bold text-ink">{p.contact}</Text>}
            <Text className="text-[13px] text-muted mt-0.5 leading-5">{p.lines}</Text>
          </View>
        )}
        {(p.status === 'pending_verification' || p.status === 'failed') && (
          <View className={p.status === 'failed' ? 'rounded-2xl bg-red-50 border border-red-100 p-3 gap-2.5' : 'rounded-2xl bg-yellow-soft border border-yellow/30 p-3 gap-2.5'}>
            <Text className="text-[13px] text-ink leading-5">
              {p.status === 'failed' ? p.lastError || 'The courier service rejected this address.' : 'The courier service needs to verify the phone number on this address before pickups can be booked. Once it is verified, refresh the status.'}
            </Text>
            <Pressable onPress={sync} disabled={syncing} className="self-start flex-row items-center gap-1.5 bg-white border border-line rounded-xl px-3.5 py-2 active:opacity-70">
              {syncing ? <ActivityIndicator size="small" color={colors.primary} /> : <Ionicons name="sync" size={14} color={colors.primary} />}
              <Text className="text-primary font-bold text-[13px]">{p.status === 'failed' ? 'Retry' : 'Refresh'}</Text>
            </Pressable>
          </View>
        )}
      </FormCard>
    </View>
  );
}

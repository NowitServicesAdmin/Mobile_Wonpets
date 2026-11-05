import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';
import { Card, Chip, T, cn } from '../ui';
import type { Offer } from '../../data/mock';
import { describeOffer, fmtShortDate, inr } from '../../utils/orders';

/** Coupon list for the cart. Eligibility and savings are calculated by the server for the current cart. */
export default function CartOffers({ offers, appliedCode, onApply, onRemove }: { offers: Offer[]; appliedCode: string; onApply: (code: string) => void; onRemove: () => void }) {
  if (!offers.length) return null;
  return (
    <Card className="gap-3">
      <View className="flex-row items-center gap-3">
        <View className="w-10 h-10 rounded-full bg-primary-soft items-center justify-center"><Ionicons name="pricetags" size={17} color={colors.primary} /></View>
        <View className="flex-1"><Text className={T.h2}>Offers for your cart</Text><Text className={T.small}>{appliedCode ? `${appliedCode} is applied` : 'Coupons from the store you are buying from'}</Text></View>
      </View>
      {offers.map((o) => {
        const applied = appliedCode === o.code;
        const applicable = !!o.applicable;
        return (
          <View key={o.id} className={cn('rounded-2xl border p-3.5 gap-1.5', applied ? 'border-green/40 bg-green-soft/60' : applicable ? 'border-primary/30 bg-primary-soft/50' : 'border-line bg-cream')}>
            <View className="flex-row items-center gap-2 flex-wrap">
              <View className="px-2.5 py-1 rounded-lg border border-dashed border-primary/60 bg-white"><Text className="text-primary font-bold text-xs">{o.code}</Text></View>
              {applied ? <Chip label="Applied" tone="green" /> : o.isBest ? <Chip label="Best offer" tone="yellow" /> : null}
            </View>
            <Text className={T.h3}>{o.title}</Text>
            <Text className={T.small}>{describeOffer(o)}</Text>
            {!!o.scopeLabel && <Text className={T.small}>{o.scopeLabel}</Text>}
            {applicable || applied ? <Text className="text-green font-bold text-xs">You save {inr(o.discountAmount ?? 0)} on this cart</Text> : !!o.reason && <Text className="text-red font-semibold text-xs">{o.reason}</Text>}
            <View className="flex-row items-center justify-between mt-1">
              <Text className="text-[11px] text-muted">Valid till {fmtShortDate(o.endDate)}</Text>
              {applied ? (
                <Pressable onPress={onRemove} className="px-4 py-2 rounded-xl border border-red/40"><Text className="text-red font-bold text-xs">Remove</Text></Pressable>
              ) : (
                <Pressable disabled={!applicable} onPress={() => onApply(o.code)} className={cn('px-5 py-2 rounded-xl', applicable ? 'bg-primary' : 'bg-gray-200')}><Text className={cn('font-bold text-xs', applicable ? 'text-white' : 'text-muted')}>Apply</Text></Pressable>
              )}
            </View>
          </View>
        );
      })}
    </Card>
  );
}

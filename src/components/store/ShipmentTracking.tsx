import React from 'react';
import { Linking, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';
import { Card, T, cn } from '../ui';
import type { Order } from '../../data/mock';
import { fmtDateTime } from '../../utils/orders';

const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <View className="flex-row justify-between gap-3"><Text className={T.body}>{label}</Text><Text className="text-sm text-ink font-semibold flex-shrink text-right">{children}</Text></View>
);

/** Courier tracking card. Hidden for delivered / cancelled orders that never shipped. */
export default function ShipmentTracking({ order }: { order: Order }) {
  const c = order.courier;
  const open = !['Delivered', 'Cancelled'].includes(order.status);
  if (!c && !open) return null;
  return (
    <Card className="gap-3">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-2"><Ionicons name="bus" size={18} color={colors.primary} /><Text className={T.h2}>Shipment Tracking</Text></View>
        {!!c?.trackUrl && (
          <Pressable onPress={() => Linking.openURL(c.trackUrl)} className="flex-row items-center gap-1"><Text className="text-primary font-bold text-xs">Courier site</Text><Ionicons name="open-outline" size={13} color={colors.primary} /></Pressable>
        )}
      </View>
      {c ? (
        <>
          <View className="gap-1.5">
            <Row label="Status">{c.status}</Row>
            <Row label="Courier">{c.name}</Row>
            <Row label="Tracking no. (AWB)">{c.awb}</Row>
            {order.status !== 'Delivered' && <Row label="Expected delivery">{c.eta}</Row>}
          </View>
          <View className="border-l-2 border-primary-soft pl-4 gap-3 ml-1">
            {c.activities.map((a, i) => (
              <View key={i}>
                <Text className={cn('text-sm', i === 0 ? 'font-bold text-ink' : 'text-ink')}>{a.activity}</Text>
                <Text className={T.small}>{a.location} · {fmtDateTime(a.time)}</Text>
              </View>
            ))}
          </View>
        </>
      ) : (
        <Text className={T.small}>Your tracking number and courier link will appear here as soon as the shipment is created.</Text>
      )}
    </Card>
  );
}

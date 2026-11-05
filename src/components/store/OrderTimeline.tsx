import React from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';
import { T, cn } from '../ui';
import type { Order } from '../../data/mock';
import { fmtDateTime } from '../../utils/orders';

const STEPS = [
  { key: 'Pending', label: 'Order Confirmed', icon: 'checkmark' },
  { key: 'Processing', label: 'Processing', icon: 'cube' },
  { key: 'Shipped', label: 'Shipped', icon: 'bicycle' },
  { key: 'Delivered', label: 'Delivered', icon: 'home' },
] as const;
const ORDER = ['Pending', 'Processing', 'Shipped', 'Delivered'];

/** Vertical stepper (mobile version of the web OrderTimeline). */
export default function OrderTimeline({ order }: { order: Order }) {
  if (order.status === 'Cancelled') {
    return (
      <View className="flex-row items-center gap-3">
        <View className="w-9 h-9 rounded-full bg-red-soft items-center justify-center"><Ionicons name="close" size={18} color={colors.red} /></View>
        <Text className="text-red font-semibold flex-1">This order was cancelled.</Text>
      </View>
    );
  }
  const current = ORDER.indexOf(order.status);
  return (
    <View>
      {STEPS.map((s, i) => {
        const done = i <= current;
        const last = i === STEPS.length - 1;
        const ts = order.timestamps?.[s.key];
        return (
          <View key={s.key} className="flex-row gap-3">
            <View className="items-center">
              <View className={cn('w-9 h-9 rounded-full items-center justify-center', done ? 'bg-primary' : 'bg-gray-100')}>
                <Ionicons name={s.icon} size={16} color={done ? '#fff' : '#A8A29E'} />
              </View>
              {!last && <View className={cn('w-0.5 flex-1 my-1 min-h-[24px] rounded-full', i < current ? 'bg-primary' : 'bg-gray-100')} />}
            </View>
            <View className={last ? '' : 'pb-5'}>
              <Text className={cn('text-sm font-bold', done ? 'text-ink' : 'text-muted')}>{s.label}</Text>
              {!!ts && <Text className={T.small + ' mt-0.5'}>{fmtDateTime(ts)}</Text>}
            </View>
          </View>
        );
      })}
    </View>
  );
}

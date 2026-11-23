import React, { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme';
import { Button, T, cn } from '../ui';
import { useCart } from '../../context/CartContext';

/**
 * Slim "Deliver to <name> - <pincode>" row under the search box. Tapping it opens a sheet to switch the delivery address
 * (the same selected address Checkout uses); adding / editing addresses happens at checkout.
 */
export default function DeliverToBar({ navigation }: { navigation: any }) {
  const { addresses, selectedAddressId, setSelectedAddressId } = useCart();
  const { bottom } = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const address = useMemo(() => addresses.find((a) => a.id === selectedAddressId) ?? addresses[0], [addresses, selectedAddressId]);

  return (
    <>
      <Pressable onPress={() => (addresses.length ? setOpen(true) : navigation.navigate('Checkout'))} className="flex-row items-center gap-1.5 px-4 pb-3 -mt-0.5 active:opacity-70" accessibilityRole="button" accessibilityLabel="Change delivery address">
        <Ionicons name="location-sharp" size={15} color={colors.primary} />
        <Text className="flex-1 text-[13px] text-muted" numberOfLines={1}>
          {address ? <>Deliver to <Text className="font-bold text-ink">{address.fullName.split(' ')[0] || address.addressType}{address.pincode ? ` - ${address.pincode}` : ''}</Text></> : 'Add a delivery address'}
        </Text>
        <Ionicons name="chevron-down" size={15} color={colors.muted} />
      </Pressable>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <View className="flex-1 justify-end bg-black/40">
          <Pressable className="flex-1" onPress={() => setOpen(false)} />
          <View className="bg-white rounded-t-[28px] p-5 gap-3" style={{ paddingBottom: Math.max(bottom, 20) }}>
            <View className="flex-row justify-between items-center">
              <Text className={T.h2}>Deliver to</Text>
              <Pressable onPress={() => setOpen(false)} hitSlop={8}><Ionicons name="close" size={24} color={colors.text} /></Pressable>
            </View>
            <ScrollView style={{ maxHeight: 320 }} contentContainerClassName="gap-2.5">
              {addresses.map((a) => {
                const on = a.id === (address?.id ?? '');
                return (
                  <Pressable key={a.id} onPress={() => { setSelectedAddressId(a.id); setOpen(false); }} className={cn('flex-row items-center gap-3 rounded-2xl border p-3.5', on ? 'border-primary bg-primary-soft' : 'border-line')}>
                    <Ionicons name={on ? 'radio-button-on' : 'radio-button-off'} size={20} color={on ? colors.primary : '#C9BFB5'} />
                    <View className="flex-1">
                      <Text className={T.h3}>{a.fullName} · {a.addressType}</Text>
                      <Text className={T.small} numberOfLines={2}>{[a.doorNo, a.area].filter(Boolean).join(', ')}{a.pincode ? ` - ${a.pincode}` : ''}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
            <Button title="Add or edit addresses at checkout" variant="outline" onPress={() => { setOpen(false); navigation.navigate('Checkout'); }} />
          </View>
        </View>
      </Modal>
    </>
  );
}
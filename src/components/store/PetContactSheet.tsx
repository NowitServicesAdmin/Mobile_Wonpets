import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Modal, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';
import { T } from '../ui';
import { Skeleton } from '../Skeletons';
import { productsService } from '../../services/store.service';
import { errorMessage } from '../../services/api';
import { toast } from '../WonPetsAlert';

type Contact = { petName: string; storeName: string; phone: string; email: string; petCount: number };

/**
 * Live pets aren't bought in the app: this modal shows the store manager's phone and email with
 * Call / WhatsApp / Email buttons (same as the web "Contact Store Manager" modal).
 */
export default function PetContactSheet({ visible, productId, petName, onClose }: { visible: boolean; productId: string; petName?: string; onClose: () => void }) {
  const [c, setC] = useState<Contact | null>(null);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible || c) return;
    setLoading(true); setErr('');
    productsService.petContact(productId).then(setC, (e) => setErr(errorMessage(e, "Couldn't load the store's contact details"))).finally(() => setLoading(false));
  }, [visible, productId]);

  const digits = (c?.phone || '').replace(/\D/g, ''); // wa.me wants digits only
  const text = encodeURIComponent(`Hi, I'm interested in the pet "${c?.petName || petName || ''}" listed on WonPets. Is it still available?`);
  const open = (url: string, what: string) => Linking.openURL(url).catch(() => toast.error(`Couldn't open ${what} on this device.`));

  const Action = ({ icon, label, bg, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; bg: string; onPress: () => void }) => (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} className="flex-1 flex-row items-center justify-center gap-2 h-11 rounded-xl active:opacity-80" style={{ backgroundColor: bg }}>
      <Ionicons name={icon} size={17} color="#fff" /><Text className="text-white font-bold text-sm">{label}</Text>
    </Pressable>
  );

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/40 items-center justify-center p-5" onPress={onClose}>
        <Pressable className="w-full max-w-[380px] bg-white rounded-3xl p-5 gap-3.5" onPress={() => {}}>
          <View className="flex-row items-start justify-between gap-3">
            <View className="flex-1">
              <View className="flex-row items-center gap-2"><Ionicons name="paw" size={16} color={colors.primary} /><Text className={T.h2}>Contact the store</Text></View>
              <Text className={T.small + ' mt-1'}>Pets aren't delivered or paid for in the app. Talk to the store and decide delivery and payment together.</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={8} accessibilityLabel="Close" className="w-8 h-8 rounded-full bg-cream items-center justify-center"><Ionicons name="close" size={17} color={colors.text} /></Pressable>
          </View>

          {loading && <View className="gap-2.5"><Skeleton className="h-[52px] w-full rounded-2xl" /><Skeleton className="h-11 w-full" /></View>}
          {!loading && !!err && <Text className="bg-red-soft text-red rounded-xl px-3 py-2 text-sm">{err}</Text>}

          {!loading && c && (
            <View className="gap-3.5">
              <View className="flex-row items-center gap-2.5 rounded-2xl border border-orange-100 bg-primary-soft px-3 py-2.5">
                <Ionicons name="storefront" size={16} color={colors.primary} />
                <View className="flex-1"><Text className="font-bold text-ink">{c.storeName}</Text><Text className={T.small}>{c.petCount} {c.petCount === 1 ? 'pet' : 'pets'} in this store</Text></View>
              </View>
              {!!c.phone && (
                <View className="gap-2">
                  <View><Text className={T.small}>Phone</Text><Text className="font-bold text-ink">{c.phone}</Text></View>
                  <View className="flex-row gap-2">
                    <Action icon="call" label="Call" bg={colors.primary} onPress={() => open(`tel:${c.phone}`, 'the dialer')} />
                    <Action icon="logo-whatsapp" label="WhatsApp" bg="#22C55E" onPress={() => open(`https://wa.me/${digits}?text=${text}`, 'WhatsApp')} />
                  </View>
                </View>
              )}
              {!!c.email && (
                <View className="gap-2">
                  <View><Text className={T.small}>Email</Text><Text className="font-bold text-ink" numberOfLines={1}>{c.email}</Text></View>
                  <View className="flex-row"><Action icon="mail" label="Send email" bg="#3B82F6" onPress={() => open(`mailto:${c.email}?subject=${encodeURIComponent(`Enquiry about ${c.petName || petName || 'a pet'}`)}&body=${text}`, 'your mail app')} /></View>
                </View>
              )}
              {!c.phone && !c.email && <Text className={T.body}>This store hasn't shared contact details yet.</Text>}
            </View>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

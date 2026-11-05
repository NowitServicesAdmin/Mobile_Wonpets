import React, { useState } from 'react';
import { Modal, Pressable, Share, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { colors } from '../../theme';
import { Button, T } from '../ui';
import type { Pet } from '../../data/mock';

// Web uses window.location.origin; on mobile point this at the deployed web app.
export const PUBLIC_BASE_URL = 'https://test.wonpetpro.com';
export const petProfileUrl = (pet: Pet) => `${PUBLIC_BASE_URL}/pet-profile/${pet.qrToken || `wp-${pet.id}`}`;

const QR_COLOR = '#2991ac';

/** Compact QR tile; tap to open a large preview you can share. */
export default function QRCodeCard({ pet }: { pet: Pet }) {
  const [open, setOpen] = useState(false);
  const url = petProfileUrl(pet);
  return (
    <>
      <Pressable onPress={() => setOpen(true)} className="flex-row items-center gap-3 bg-white rounded-3xl border border-line p-3.5 active:opacity-80">
        <View className="bg-white rounded-xl p-1.5 border border-line">
          <QRCode value={url} size={64} color={QR_COLOR} backgroundColor="#fff" ecl="H" />
        </View>
        <View className="flex-1">
          <Text className={T.h3}>{pet.name}'s QR code</Text>
          <Text className={T.small}>Anyone who scans it sees {pet.name}'s public profile.</Text>
        </View>
        <Ionicons name="expand-outline" size={20} color={colors.primary} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable onPress={() => setOpen(false)} className="flex-1 bg-black/50 items-center justify-center p-6">
          <Pressable className="bg-white rounded-[28px] p-6 items-center self-stretch gap-3">
            <Text className={T.h2}>{pet.name}</Text>
            <View className="rounded-2xl border border-line p-3">
              <QRCode value={url} size={220} color={QR_COLOR} backgroundColor="#fff" ecl="H" />
            </View>
            <Text className={T.small + ' text-center'}>{url}</Text>
            <Button className="self-stretch" title="Share QR link" icon={<Ionicons name="share-social-outline" size={18} color="#fff" />}
              onPress={() => Share.share({ message: `${pet.name}'s WONPET profile: ${url}` })} />
            <Button className="self-stretch" variant="neutral" title="Close" onPress={() => setOpen(false)} />
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

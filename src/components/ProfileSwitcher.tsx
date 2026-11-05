import React from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme';
import { Avatar } from './Avatar';
import { T, cn } from './ui';
import { useAuth } from '../context/AuthContext';
import { useManaged } from '../context/ManagedContext';

function Row({ active, onPress, title, subtitle, icon, image }: { active: boolean; onPress: () => void; title: string; subtitle: string; icon?: keyof typeof Ionicons.glyphMap; image?: string }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
      className={cn('flex-row items-center gap-3 rounded-2xl border p-3 active:opacity-80', active ? 'border-primary bg-primary-soft/60' : 'border-line bg-white')}
    >
      {icon ? (
        <View className="w-11 h-11 rounded-full bg-primary-soft items-center justify-center"><Ionicons name={icon} size={20} color={colors.primary} /></View>
      ) : (
        <Avatar image={image} emoji="🦅" size={44} />
      )}
      <View className="flex-1">
        <Text numberOfLines={1} className={T.h3}>{title}</Text>
        <Text numberOfLines={1} className={T.small}>{subtitle}</Text>
      </View>
      {active && <Ionicons name="checkmark-circle" size={22} color={colors.primary} />}
    </Pressable>
  );
}

/** Bottom sheet: pick My Account or the pets shared with you (same choices as the web navbar's "Switch Account"). */
export default function ProfileSwitcher({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { accounts, isManaged, enterManaged, exitManaged } = useManaged();
  const owners = accounts.map((a) => a.ownerName).filter(Boolean);
  const petCount = accounts.reduce((n, a) => n + a.petIds.length, 0);

  const pick = (managed: boolean) => {
    onClose();
    if (managed !== isManaged) (managed ? enterManaged : exitManaged)();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/40">
        <Pressable className="flex-1" onPress={onClose} accessibilityLabel="Close" />
        <View className="bg-white rounded-t-[28px] px-5 pt-5 gap-3" style={{ paddingBottom: Math.max(insets.bottom, 16) + 4 }}>
          <View className="flex-row items-center justify-between">
            <View className="flex-1"><Text className={T.h2}>Switch account</Text><Text className={T.small}>Choose whose pets you want to see.</Text></View>
            <Pressable onPress={onClose} hitSlop={8} accessibilityLabel="Close"><Ionicons name="close" size={24} color={colors.text} /></Pressable>
          </View>

          <Row active={!isManaged} onPress={() => pick(false)} title={user?.name || 'My account'} subtitle="My Account" image={user?.profileImage} />

          {accounts.length > 0 && (
            <>
              <Text className="text-[11px] font-extrabold text-muted uppercase tracking-wider mt-1">Shared with me</Text>
              <Row
                active={isManaged}
                onPress={() => pick(true)}
                icon="swap-horizontal"
                title="All shared pets"
                subtitle={`${petCount} pet${petCount === 1 ? '' : 's'} · from ${owners.join(', ')}`}
              />
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

/** Row for the Profile tab (its own header hides the app header), so the switch is reachable there too. */
export function SwitchAccountCard() {
  const { canSwitch, isManaged } = useManaged();
  const [open, setOpen] = React.useState(false);
  if (!canSwitch) return null;
  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel="Switch account"
        className="flex-row items-center gap-3 bg-white rounded-3xl border border-orange-100 p-3.5 active:opacity-80"
      >
        <View className="w-10 h-10 rounded-xl bg-primary-soft items-center justify-center"><Ionicons name="swap-horizontal" size={20} color={colors.primary} /></View>
        <View className="flex-1">
          <Text numberOfLines={1} className="text-[15px] font-extrabold text-ink">Switch account</Text>
          <Text numberOfLines={1} className="text-[12px] text-muted">{isManaged ? 'Viewing shared pets' : 'Open pets shared with you'}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.muted} />
      </Pressable>
      <ProfileSwitcher visible={open} onClose={() => setOpen(false)} />
    </>
  );
}

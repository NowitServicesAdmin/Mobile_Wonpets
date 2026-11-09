import React, { useEffect, useRef, useState } from 'react';
import { BackHandler, Pressable, ScrollView, Text, View, type ScrollViewInstance } from 'react-native';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';
import { Card, Chip, cn } from '../../components/ui';
import { Avatar } from '../../components/Avatar';
import { WonPetsAlert } from '../../components/WonPetsAlert';
import ProfileSection from '../../components/settings/ProfileSection';
import SubscriptionSection from '../../components/settings/SubscriptionSection';
import DocumentsSection from '../../components/settings/DocumentsSection';
import NotificationsSection from '../../components/settings/NotificationsSection';
import CollaboratorsSection from '../../components/settings/CollaboratorsSection';
import SharedWithMeSection from '../../components/settings/SharedWithMeSection';
import { SwitchAccountCard } from '../../components/ProfileSwitcher';
import InviteSection from '../../components/settings/InviteSection';
import FaqSection from '../../components/settings/FaqSection';
import ContactSection from '../../components/settings/ContactSection';
import { useSettings } from '../../context/SettingsContext';
import { useAuth } from '../../context/AuthContext';
import { headerLocation } from '../../utils/location';
import { FormSkeleton } from '../../components/Skeletons';

type Key = 'profile' | 'subscription' | 'documents' | 'notifications' | 'collaborators' | 'shared' | 'invite' | 'faq' | 'support';
// Additional Information and Language now live inside Profile - old deep links still land there
const LEGACY: Record<string, Key> = { info: 'profile', language: 'profile' };
type IconName = keyof typeof Ionicons.glyphMap;
type ToneKey = 'orange' | 'purple' | 'blue' | 'green' | 'yellow' | 'pink';

// tinted icon square + icon colour per tone (colour-coding is the system)
const TONE: Record<ToneKey, { box: string; fg: string }> = {
  orange: { box: 'bg-primary-soft', fg: colors.primary },
  purple: { box: 'bg-purple-soft', fg: colors.purple },
  blue: { box: 'bg-blue-soft', fg: colors.blue },
  green: { box: 'bg-green-soft', fg: colors.green },
  yellow: { box: 'bg-yellow-soft', fg: colors.yellow },
  pink: { box: 'bg-pink-soft', fg: colors.pink },
};

const sections: Record<Key, { title: string; hint: string; icon: IconName; tone: ToneKey; Body: React.ComponentType }> = {
  profile: { title: 'Profile', hint: 'Photo, contact, address, language', icon: 'person-outline', tone: 'orange', Body: ProfileSection },
  subscription: { title: 'Subscription', hint: 'Plans & billing', icon: 'card-outline', tone: 'purple', Body: SubscriptionSection },
  documents: { title: 'Documents', hint: 'Identity proof', icon: 'document-text-outline', tone: 'green', Body: DocumentsSection },
  notifications: { title: 'Notifications', hint: 'Email, alerts, reminders', icon: 'notifications-outline', tone: 'yellow', Body: NotificationsSection },
  collaborators: { title: 'Collaborators', hint: 'People you share pets with', icon: 'people-outline', tone: 'purple', Body: CollaboratorsSection },
  shared: { title: 'Shared With Me', hint: 'Pets others shared with you', icon: 'share-social-outline', tone: 'pink', Body: SharedWithMeSection },
  invite: { title: 'Invite', hint: 'Invite friends to WONPET', icon: 'person-add-outline', tone: 'orange', Body: InviteSection },
  faq: { title: 'Frequently Asked Questions', hint: 'Quick answers', icon: 'help-circle-outline', tone: 'purple', Body: FaqSection },
  support: { title: 'Contact & Support', hint: 'We are here to help', icon: 'headset-outline', tone: 'green', Body: ContactSection },
};

const toKey = (k?: string): Key | null => (k ? (LEGACY[k] ?? (k in sections ? (k as Key) : null)) : null);

// grouped lists - every existing section is here
const groups: { id: string; title: string; items: Key[] }[] = [
  { id: 'account', title: 'Account', items: ['subscription', 'documents'] }, // Profile opens from the profile card above
  { id: 'prefs', title: 'Preferences', items: ['notifications'] },
  { id: 'sharing', title: 'Sharing', items: ['collaborators', 'shared', 'invite'] },
  { id: 'support', title: 'Help & Support', items: ['faq', 'support'] },
];

// sections whose data comes from the settings API - they wait for the first load so their forms start with real values
const SERVER_BACKED: Key[] = ['subscription', 'documents', 'notifications', 'collaborators', 'shared'];
// "Shared With Me" only appears once someone has sent this user a collaboration request (pending or accepted)
const ONLY_WHEN_INVITED: Key[] = ['shared'];
// these pages draw their own cards, so they are not wrapped in the white Card
const NO_CARD: Key[] = ['profile', 'notifications'];

/** Profile tab (route name stays "Settings"). The app header is hidden here - this screen draws its own slim top bar.
 *  Open with { open: 'shared' } (or any section key) to jump straight to a section, e.g. from a notification or the dashboard's Contact Support.
 *  Tapping a row opens that section as its own page (back arrow + title) inside this same tab screen. */
export default function SettingsScreen({ route }: any) {
  const insets = useSafeAreaInsets();
  const { signOut, user } = useAuth();
  const { invitations, subscription, plans, info, ready } = useSettings();
  const nav = useNavigation<any>();
  const focused = useIsFocused();
  const [open, setOpen] = useState<Key | null>(toKey(route.params?.open));
  const scroll = useRef<ScrollViewInstance>(null);
  const place = headerLocation(info, user?.location); // same source as the app header
  const pendingInvites = invitations.filter((i) => i.status === 'pending').length;
  const planName = subscription ? plans.find((p) => p.id === subscription.planId)?.name ?? 'Plan' : 'Free';

  // the screen is a tab, so it stays mounted - react when another screen asks for a section
  useEffect(() => {
    const k = toKey(route.params?.open);
    if (k) setOpen(k);
  }, [route.params?.open, route.params?.at]); // `at` changes on every request, so asking for the same section twice still works
  // every page starts at the top
  useEffect(() => { scroll.current?.scrollTo({ y: 0, animated: false }); }, [open]);
  // phone back button closes the open page first
  useEffect(() => {
    if (!open || !focused) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { setOpen(null); return true; });
    return () => sub.remove();
  }, [open, focused]);
  // tapping the Profile tab again returns to the list
  useEffect(() => nav.addListener('tabPress', () => { if (open && nav.isFocused()) setOpen(null); }), [nav, open]);

  const confirmLogout = async () => {
    const r = await WonPetsAlert.confirm('Log out?', 'You will need to sign in again.', { confirmText: 'Log out' });
    if (r.isConfirmed) signOut();
  };

  const visible = (k: Key) => !ONLY_WHEN_INVITED.includes(k) || invitations.length > 0;

  const renderRow = (key: Key, index: number) => {
    const { title, hint, icon, tone } = sections[key];
    const value = key === 'subscription' ? planName : '';
    return (
      <Pressable
        key={key}
        onPress={() => setOpen(key)}
        accessibilityRole="button"
        accessibilityLabel={title}
        className={cn('flex-row items-center gap-3 px-3.5 py-3 active:bg-cream', index > 0 && 'border-t border-line')}
      >
        <View className={cn('w-10 h-10 rounded-xl items-center justify-center', TONE[tone].box)}>
          <Ionicons name={icon} size={19} color={TONE[tone].fg} />
        </View>
        <View className="flex-1">
          <Text maxFontSizeMultiplier={1.1} numberOfLines={1} className="text-[15px] font-extrabold text-ink">{title}</Text>
          <Text maxFontSizeMultiplier={1.1} numberOfLines={1} className="text-[12px] text-muted">{hint}</Text>
        </View>
        {!!value && (
          <Text
            maxFontSizeMultiplier={1.1}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.8}
            className="text-[12px] font-semibold text-muted max-w-[90px]"
          >
            {value}
          </Text>
        )}
        {key === 'shared' && pendingInvites > 0 && (
          <View className="min-w-[20px] h-5 px-1.5 rounded-full bg-primary items-center justify-center">
            <Text maxFontSizeMultiplier={1.1} numberOfLines={1} className="text-white text-[11px] font-bold">{pendingInvites}</Text>
          </View>
        )}
        <Ionicons name="chevron-forward" size={18} color={colors.muted} />
      </Pressable>
    );
  };

  const openTitle = open ? sections[open].title : 'Profile';
  const Body = open ? sections[open].Body : null;
    const bodyEl = open && Body
    ? (!ready && SERVER_BACKED.includes(open)
        ? <Card className="border-orange-100"><FormSkeleton fields={3} /></Card>
        : NO_CARD.includes(open) ? <Body /> : <Card className="border-orange-100"><Body /></Card>)
    : null;

  return (
    <View className="flex-1 bg-cream">
      {/* slim top bar (the app header is hidden on this tab) */}
      <View style={{ paddingTop: insets.top + 8 }} className="px-4 pb-2.5 bg-cream border-b border-line">
        <View className="flex-row items-center h-[38px]">
          {open ? (
            <Pressable onPress={() => setOpen(null)} hitSlop={8} accessibilityRole="button" accessibilityLabel="Back" className="w-[38px] h-[38px] rounded-xl bg-white border border-line items-center justify-center active:opacity-70">
              <Ionicons name="arrow-back" size={19} color={colors.text} />
            </Pressable>
          ) : <View className="w-[38px]" />}
          <Text maxFontSizeMultiplier={1.1} numberOfLines={1} className="flex-1 text-center text-[19px] font-black text-ink px-2">{openTitle}</Text>
          <View className="w-[38px]" />
        </View>
      </View>

      <ScrollView ref={scroll} className="flex-1" contentContainerClassName="p-4 gap-3.5 pb-10" keyboardShouldPersistTaps="handled">
        {bodyEl ? (
          bodyEl
        ) : (
          <>
            {/* profile card: avatar left, name + email middle, chevron right */}
            <Pressable
              onPress={() => setOpen('profile')}
              accessibilityRole="button"
              accessibilityLabel="Edit profile"
              className="flex-row items-center gap-3 bg-white rounded-3xl border border-orange-100 p-3.5 active:opacity-80"
            >
              <View className="rounded-full p-0.5 bg-orange-300">
                <View className="rounded-full bg-white p-0.5"><Avatar image={user?.profileImage} emoji="🦅" size={60} /></View>
              </View>
              <View className="flex-1">
                <Text maxFontSizeMultiplier={1.1} numberOfLines={1} className="text-[18px] font-black text-ink">{user?.name ?? 'Profile'}</Text>
                <Text maxFontSizeMultiplier={1.1} numberOfLines={1} className="text-[12px] text-muted">{user?.email}</Text>
                <View className="flex-row items-center gap-2 mt-1.5">
                  <Chip label={planName} tone="orange" />
                  {!!place && (
                    <View className="flex-1 flex-row items-center gap-1">
                      <Ionicons name="location" size={12} color={colors.primary} />
                      <Text maxFontSizeMultiplier={1.1} numberOfLines={1} className="flex-1 text-[12px] text-muted">{place}</Text>
                    </View>
                  )}
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.muted} />
            </Pressable>

            {/* only shows when someone is sharing pets with you */}
            <SwitchAccountCard />

            {groups.filter((g) => g.items.some(visible)).map((g) => (
              <View key={g.id}>
                <Text maxFontSizeMultiplier={1.1} numberOfLines={1} className="text-[12px] font-extrabold text-muted uppercase tracking-wider mb-1.5 ml-2">{g.title}</Text>
                <View className="bg-white rounded-3xl border border-orange-100 overflow-hidden">
                  {g.items.filter(visible).map((k, i) => renderRow(k, i))}
                </View>
              </View>
            ))}

            {/* logout - same confirm step as before */}
            <Pressable onPress={confirmLogout} accessibilityRole="button" accessibilityLabel="Logout" className="flex-row items-center justify-center gap-2 bg-red-soft border border-red/20 rounded-2xl py-3.5 active:opacity-80">
              <Ionicons name="log-out-outline" size={19} color={colors.red} />
              <Text maxFontSizeMultiplier={1.1} numberOfLines={1} className="text-red font-extrabold text-[15px]">Logout</Text>
            </Pressable>
            <Text maxFontSizeMultiplier={1.1} numberOfLines={1} className="text-center text-xs text-muted">WON PET PRO · v1.1.0</Text>
          </>
        )}
      </ScrollView>
    </View>
  );
}
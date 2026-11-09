import React, { useEffect, useRef, useState } from 'react';
import { BackHandler, Pressable, ScrollView, Text, View, type ScrollViewInstance } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';
import { Card, Chip, Tone, cn } from '../../components/ui';
import { Avatar } from '../../components/Avatar';
import { MENU_TONE, MenuTone } from '../../components/common/MenuRow';
import { WonPetsAlert } from '../../components/WonPetsAlert';
import { FormSkeleton } from '../../components/Skeletons';
import StatusSheet, { StatusDot } from '../../components/doctor/StatusSheet';
import DoctorProfileForm from '../../components/doctor/DoctorProfileForm';
import ClinicDetailsSection from '../../components/doctor/ClinicDetailsSection';
import KycSection, { KYC_STATUS } from '../../components/doctor/KycSection';
import DocumentsSection from '../../components/settings/DocumentsSection';
import NotificationsSection from '../../components/settings/NotificationsSection';
import LanguageSection from '../../components/settings/LanguageSection';
import FaqSection from '../../components/settings/FaqSection';
import ContactSection from '../../components/settings/ContactSection';
import SharedWithMeSection from '../../components/settings/SharedWithMeSection';
import { SwitchAccountCard } from '../../components/ProfileSwitcher';
import { DOCTOR_DOCUMENT_TYPES } from '../../data/settings';
import { KycStatus, kycService } from '../../services/kyc.service';
import { STATUS_OPTIONS, useDoctor } from '../../context/DoctorContext';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';
import { useSettings } from '../../context/SettingsContext';
import { useLanguage } from '../../context/LanguageContext';
import { headerLocation } from '../../utils/location';

type IconName = keyof typeof Ionicons.glyphMap;
type Key = 'profile' | 'clinic' | 'kyc' | 'documents' | 'prefs' | 'shared' | 'language' | 'faq' | 'support';

const DocumentsBody = () => <DocumentsSection types={DOCTOR_DOCUMENT_TYPES} />;
const sections: Record<Key, { title: string; icon: IconName; Body: React.ComponentType<any> }> = {
  profile: { title: 'Profile', icon: 'person-outline', Body: DoctorProfileForm },
  clinic: { title: 'Clinic details', icon: 'medkit-outline', Body: ClinicDetailsSection },
  kyc: { title: 'KYC & payouts', icon: 'card-outline', Body: KycSection },
  documents: { title: 'Documents', icon: 'document-text-outline', Body: DocumentsBody },
  prefs: { title: 'Notification settings', icon: 'notifications-outline', Body: NotificationsSection },
  shared: { title: 'Shared With Me', icon: 'share-social-outline', Body: SharedWithMeSection },
  language: { title: 'Language', icon: 'language-outline', Body: LanguageSection },
  faq: { title: 'Frequently Asked Questions', icon: 'help-circle-outline', Body: FaqSection },
  support: { title: 'Contact & Support', icon: 'headset-outline', Body: ContactSection },
};
const toKey = (k?: string): Key | null => (k && k in sections ? (k as Key) : null);

// sections that draw their own cards, so they are not wrapped in the white Card
const NO_CARD: Key[] = ['profile', 'clinic', 'kyc', 'prefs'];
// sections whose data comes from the settings API - they wait for the first load so their forms start with real values
const SERVER_BACKED: Key[] = ['clinic', 'documents', 'prefs', 'shared'];

type Item =
  | { kind: 'page'; key: Key; title: string; hint: string; icon: IconName; tone: MenuTone }
  | { kind: 'route'; route: string; title: string; hint: string; icon: IconName; tone: MenuTone; badge?: 'chat' | 'notifications' };

const PRACTICE: Item[] = [
  { kind: 'route', route: 'Availability', title: 'Availability', hint: 'Working hours, days, fee, visit types', icon: 'time-outline', tone: 'orange' },
  { kind: 'route', route: 'Earnings', title: 'Earnings', hint: 'Today, this month and trends', icon: 'cash-outline', tone: 'green' },
  // { kind: 'route', route: 'Prescriptions', title: 'Prescriptions', hint: "Everything you've issued", icon: 'document-text-outline', tone: 'purple' },
  // { kind: 'route', route: 'FollowUps', title: 'Follow-ups', hint: 'Pets due to come back', icon: 'repeat-outline', tone: 'blue' },
  // { kind: 'route', route: 'MedicalRecords', title: 'Medical records', hint: "Diagnoses and treatments you've written", icon: 'flask-outline', tone: 'pink' },
];
// const INBOX: Item[] = [
//   { kind: 'route', route: 'Chat', title: 'Messages', hint: 'Chat with pet owners', icon: 'chatbubble-ellipses-outline', tone: 'pink', badge: 'chat' },
//   { kind: 'route', route: 'Notifications', title: 'Notifications', hint: 'Requests, reminders, updates', icon: 'notifications-outline', tone: 'yellow', badge: 'notifications' },
// ];
const page = (key: Key, hint: string, tone: MenuTone): Item => ({ kind: 'page', key, title: sections[key].title, hint, icon: sections[key].icon, tone });
const ACCOUNT: Item[] = [
  page('clinic', 'Clinic name, specialization, address', 'orange'),
  page('kyc', 'Bank details to receive payouts', 'green'),
  page('documents', 'Medical licence, identity proof', 'purple'),
];
const PREFS: Item[] = [
  page('prefs', 'Email, alerts, reminders', 'yellow'),
  page('language', 'Choose the language the app is shown in', 'blue'),
];
// "Shared With Me" only appears once an owner has sent this doctor a collaboration request (pending or accepted) - same rule as the owner app
const SHARING: Item[] = [page('shared', 'Pets owners shared with you', 'pink')];
const HELP: Item[] = [
  page('faq', 'Quick answers', 'purple'),
  page('support', 'We are here to help', 'green'),
];

/** Profile tab. Same layout as the owner's Profile: a profile card on top (tap to edit), grouped rows below, every row opens as its own
 *  page (back arrow + title) inside this tab. Open with { open: 'kyc' } (any section key) to jump straight to a section. */
export default function DoctorProfileScreen({ navigation, route }: any) {
  const insets = useSafeAreaInsets();
  const focused = useIsFocused();
  const { user, signOut } = useAuth();
  const { profile, status, unread } = useDoctor();
  const { totalUnread } = useChat();
  const { info, documents, ready, invitations } = useSettings();
  const { language } = useLanguage();
  const [open, setOpen] = useState<Key | null>(toKey(route.params?.open));
  const [statusOpen, setStatusOpen] = useState(false);
  const [kyc, setKyc] = useState<KycStatus | null>(null);
  const scroll = useRef<ScrollViewInstance>(null);

  const name = user?.name ?? profile?.name ?? 'Doctor';
  const label = STATUS_OPTIONS.find((o) => o.value === status)?.label ?? 'Available';
  const hint = STATUS_OPTIONS.find((o) => o.value === status)?.hint;
  const place = headerLocation(info, user?.location);

  // the screen is a tab, so it stays mounted - react when another screen asks for a section
  useEffect(() => {
    const k = toKey(route.params?.open);
    if (k) setOpen(k);
  }, [route.params?.open, route.params?.at]);
  // every page starts at the top
  useEffect(() => { scroll.current?.scrollTo({ y: 0, animated: false }); }, [open]);
  // phone back button closes the open page first
  useEffect(() => {
    if (!open || !focused) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { setOpen(null); return true; });
    return () => sub.remove();
  }, [open, focused]);
  // tapping the Profile tab again returns to the list
  useEffect(() => navigation.addListener('tabPress', () => { if (open && navigation.isFocused()) setOpen(null); }), [navigation, open]);
  // KYC status for the row + the "finish setting up" card (re-read whenever we are back on the list)
  useEffect(() => { if (!open) kycService.get().then((d) => setKyc(d.status)).catch(() => {}); }, [open]);

  const logout = async () => {
    const r = await WonPetsAlert.logout('Log out?', 'You will need to sign in again to see your schedule.');
    if (r.isConfirmed) signOut();
  };

  // what is still missing - each one opens the page that fixes it
  const todo: { key: Key; label: string }[] = [];
  if (!user?.email || !user?.phone) todo.push({ key: 'profile', label: !user?.email ? 'Add email' : 'Add mobile' });
  if (ready && (!info.clinicName?.trim() || !info.specialization?.trim() || !info.location)) todo.push({ key: 'clinic', label: 'Clinic details' });
  if (ready && DOCTOR_DOCUMENT_TYPES.some((d) => !documents[d.key])) todo.push({ key: 'documents', label: 'Upload documents' });
  if (kyc && kyc !== 'activated' && kyc !== 'under_review') todo.push({ key: 'kyc', label: 'Complete KYC' });

  const pendingInvites = invitations.filter((i) => i.status === 'pending').length;
  const docsDone = DOCTOR_DOCUMENT_TYPES.filter((d) => documents[d.key]).length;
  const rowValue = (it: Item): { text?: string; chip?: { label: string; tone: Tone } } => {
    if (it.kind !== 'page') return {};
    if (it.key === 'kyc' && kyc) return { chip: KYC_STATUS[kyc] };
    if (it.key === 'documents' && ready) return { text: `${docsDone}/${DOCTOR_DOCUMENT_TYPES.length}` };
    if (it.key === 'language') return { text: language.label };
    if (it.key === 'shared' && pendingInvites > 0) return { chip: { label: `${pendingInvites} new`, tone: 'yellow' as Tone } };
    return {};
  };

  const renderRow = (it: Item, index: number) => {
    const t = MENU_TONE[it.tone];
    const v = rowValue(it);
    const badge = it.kind === 'route' ? (it.badge === 'chat' ? totalUnread : it.badge === 'notifications' ? unread : 0) : 0;
    return (
      <Pressable
        key={it.kind === 'page' ? it.key : it.route}
        onPress={() => (it.kind === 'page' ? setOpen(it.key) : navigation.navigate(it.route))}
        accessibilityRole="button"
        accessibilityLabel={it.title}
        className={cn('flex-row items-center gap-3 px-3.5 py-3 active:bg-cream', index > 0 && 'border-t border-line')}
      >
        <View className={cn('w-10 h-10 rounded-xl items-center justify-center', t.box)}><Ionicons name={it.icon} size={19} color={t.fg} /></View>
        <View className="flex-1">
          <Text maxFontSizeMultiplier={1.1} numberOfLines={1} className="text-[15px] font-extrabold text-ink">{it.title}</Text>
          <Text maxFontSizeMultiplier={1.1} numberOfLines={1} className="text-[12px] text-muted">{it.hint}</Text>
        </View>
        {!!v.chip && <Chip label={v.chip.label} tone={v.chip.tone} />}
        {!!v.text && <Text noTranslate={it.kind === 'page' && it.key === 'language'} maxFontSizeMultiplier={1.1} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} className="text-[12px] font-semibold text-muted max-w-[90px]">{v.text}</Text>}
        {badge > 0 && (
          <View className="min-w-[20px] h-5 px-1.5 rounded-full bg-primary items-center justify-center">
            <Text maxFontSizeMultiplier={1.1} numberOfLines={1} className="text-white text-[11px] font-bold">{badge > 99 ? '99+' : badge}</Text>
          </View>
        )}
        <Ionicons name="chevron-forward" size={18} color={colors.muted} />
      </Pressable>
    );
  };

  const group = (title: string, items: Item[]) => (
    <View key={title}>
      <Text maxFontSizeMultiplier={1.1} numberOfLines={1} className="text-[12px] font-extrabold text-muted uppercase tracking-wider mb-1.5 ml-2">{title}</Text>
      <View className="bg-white rounded-3xl border border-orange-100 overflow-hidden">{items.map(renderRow)}</View>
    </View>
  );

  const openTitle = open ? sections[open].title : 'Profile';
  const Body = open ? sections[open].Body : null;
  const bodyEl = open && Body
    ? (!ready && SERVER_BACKED.includes(open)
        ? <Card className="border-orange-100"><FormSkeleton fields={3} /></Card>
        : NO_CARD.includes(open)
          ? (open === 'kyc' ? <KycSection onStatus={setKyc} /> : <Body />)
          : <Card className="border-orange-100"><Body /></Card>)
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
            {/* profile card: avatar left, name + contact middle, chevron right - tap to edit */}
            <Pressable
              onPress={() => setOpen('profile')}
              accessibilityRole="button"
              accessibilityLabel="Edit profile"
              className="flex-row items-center gap-3 bg-white rounded-3xl border border-orange-100 p-3.5 active:opacity-80"
            >
              <View className="rounded-full p-0.5 bg-orange-300">
                <View className="rounded-full bg-white p-0.5"><Avatar image={user?.profileImage ?? profile?.image} emoji="🩺" size={60} /></View>
              </View>
              <View className="flex-1">
                <Text maxFontSizeMultiplier={1.1} numberOfLines={1} className="text-[18px] font-black text-ink">{/^dr\.?\s/i.test(name) ? name : `Dr. ${name}`}</Text>
                <Text maxFontSizeMultiplier={1.1} numberOfLines={1} className="text-[12px] text-muted">{user?.email || user?.phone}</Text>
                <View className="flex-row items-center gap-2 mt-1.5">
                  <Chip label={profile?.specialization || 'Veterinarian'} tone="orange" />
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

            {/* presence status: one tap to change */}
            <Pressable onPress={() => setStatusOpen(true)} accessibilityRole="button" accessibilityLabel={`Status ${label}. Change`} className="flex-row items-center gap-3 bg-white rounded-3xl border border-orange-100 px-3.5 py-3 active:opacity-80">
              <View className="w-10 h-10 rounded-xl bg-green-soft items-center justify-center"><StatusDot size={13} /></View>
              <View className="flex-1">
                <Text maxFontSizeMultiplier={1.1} numberOfLines={1} className="text-[15px] font-extrabold text-ink">{label}</Text>
                <Text maxFontSizeMultiplier={1.1} numberOfLines={1} className="text-[12px] text-muted">{hint ?? 'What pet owners see next to your name'}</Text>
              </View>
              <Text className="text-primary font-bold text-[13px]">Change</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.muted} />
            </Pressable>

            {/* only while something is still missing */}
            {todo.length > 0 && (
              <View className="bg-primary-soft rounded-3xl border border-orange-100 p-3.5 gap-2.5">
                <View className="flex-row items-center gap-2"><Ionicons name="sparkles-outline" size={16} color={colors.primary} /><Text maxFontSizeMultiplier={1.1} className="flex-1 text-[14px] font-extrabold text-ink">Finish setting up your profile</Text></View>
                <View className="flex-row flex-wrap gap-2">{todo.map((t) => <Chip key={t.key} tone="white" label={`+ ${t.label}`} onPress={() => setOpen(t.key)} />)}</View>
              </View>
            )}

            {/* switch into the pets shared with this doctor (only when an owner shares pets) */}
            <SwitchAccountCard />

            {group('Your practice', PRACTICE)}
            {/* {group('Inbox', INBOX)} */}
            {group('Account', ACCOUNT)}
            {group('Preferences', PREFS)}
            {invitations.length > 0 && group('Sharing', SHARING)}
            {group('Help & Support', HELP)}

            {/* logout - same confirm step as before */}
            <Pressable onPress={logout} accessibilityRole="button" accessibilityLabel="Logout" className="flex-row items-center justify-center gap-2 bg-red-soft border border-red/20 rounded-2xl py-3.5 active:opacity-80">
              <Ionicons name="log-out-outline" size={19} color={colors.red} />
              <Text maxFontSizeMultiplier={1.1} numberOfLines={1} className="text-red font-extrabold text-[15px]">Logout</Text>
            </Pressable>
            <Text maxFontSizeMultiplier={1.1} numberOfLines={1} className="text-center text-xs text-muted">WON PET PRO · v1.1.0</Text>
          </>
        )}
      </ScrollView>

      <StatusSheet visible={statusOpen} onClose={() => setStatusOpen(false)} />
    </View>
  );
}

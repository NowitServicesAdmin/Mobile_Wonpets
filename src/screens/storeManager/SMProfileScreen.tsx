import React, { useEffect, useRef, useState } from 'react';
import { BackHandler, Pressable, ScrollView, Text, View } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';
import { Card, Chip, Tone, cn } from '../../components/ui';
import { Avatar } from '../../components/Avatar';
import { MENU_TONE, MenuTone } from '../../components/common/MenuRow';
import { WonPetsAlert } from '../../components/WonPetsAlert';
import { FormSkeleton } from '../../components/Skeletons';
import DoctorProfileForm from '../../components/doctor/DoctorProfileForm';
import KycSection, { KYC_STATUS } from '../../components/doctor/KycSection';
import StoreDetailsSection from '../../components/storeManager/StoreDetailsSection';
import PickupSection, { PICKUP_STATUS } from '../../components/storeManager/PickupSection';
import { Badge } from '../../components/storeManager/SMUI';
import DocumentsSection from '../../components/settings/DocumentsSection';
import NotificationsSection from '../../components/settings/NotificationsSection';
import LanguageSection from '../../components/settings/LanguageSection';
import FaqSection from '../../components/settings/FaqSection';
import ContactSection from '../../components/settings/ContactSection';
import { STORE_DOCUMENT_TYPES, STORE_FAQS, STORE_NOTIFICATION_KEYS } from '../../data/settings';
import { KycStatus, kycService } from '../../services/kyc.service';
import { Pickup, smService } from '../../services/storeManager.service';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { useLanguage } from '../../context/LanguageContext';
import { useStoreManager } from '../../context/StoreManagerContext';
import { headerLocation } from '../../utils/location';

type IconName = keyof typeof Ionicons.glyphMap;
type Key = 'profile' | 'store' | 'pickup' | 'kyc' | 'documents' | 'prefs' | 'language' | 'faq' | 'support';

const sections: Record<Key, { title: string; icon: IconName }> = {
  profile: { title: 'Profile', icon: 'person-outline' },
  store: { title: 'Store details', icon: 'storefront-outline' },
  pickup: { title: 'Courier pickup', icon: 'cube-outline' },
  kyc: { title: 'KYC & payouts', icon: 'card-outline' },
  documents: { title: 'Documents', icon: 'document-text-outline' },
  prefs: { title: 'Notification settings', icon: 'notifications-outline' },
  language: { title: 'Language', icon: 'language-outline' },
  faq: { title: 'Frequently Asked Questions', icon: 'help-circle-outline' },
  support: { title: 'Contact & Support', icon: 'headset-outline' },
};
const toKey = (k?: string): Key | null => (k && k in sections ? (k as Key) : null);
// sections that draw their own cards
const NO_CARD: Key[] = ['profile', 'store', 'pickup', 'kyc', 'prefs'];
const SERVER_BACKED: Key[] = ['store', 'documents', 'prefs'];

type Item =
  | { kind: 'page'; key: Key; title: string; hint: string; icon: IconName; tone: MenuTone }
  | { kind: 'route'; route: string; title: string; hint: string; icon: IconName; tone: MenuTone };
const page = (key: Key, hint: string, tone: MenuTone): Item => ({ kind: 'page', key, title: sections[key].title, hint, icon: sections[key].icon, tone });

const STORE: Item[] = [
  page('store', 'Store name, category, GST, address', 'orange'),
  page('pickup', 'Where couriers collect your parcels', 'blue'),
  { kind: 'route', route: 'SMEarnings', title: 'Earnings', hint: 'Revenue, payouts and transactions', icon: 'wallet-outline', tone: 'green' },
  { kind: 'route', route: 'SMReports', title: 'Reports & analytics', hint: 'Sales trends and exports', icon: 'bar-chart-outline', tone: 'purple' },
];
const ACCOUNT: Item[] = [
  page('kyc', 'Bank details to receive payouts', 'green'),
  page('documents', 'Business licence, GST, identity', 'purple'),
];
const PREFS: Item[] = [
  page('prefs', 'Order emails and alerts', 'yellow'),
  page('language', 'Choose the language the app is shown in', 'blue'),
];
const HELP: Item[] = [page('faq', 'Quick answers', 'purple'), page('support', 'We are here to help', 'green')];

/** Profile tab for store managers - same layout as the owner / doctor Profile: a profile card, grouped rows,
 *  each row opens as its own page inside the tab. Open with { open: 'kyc' } (any key) to jump to a section. */
export default function SMProfileScreen({ navigation, route }: any) {
  const insets = useSafeAreaInsets();
  const focused = useIsFocused();
  const { user, signOut } = useAuth();
  const { info, documents, ready } = useSettings();
  const { language } = useLanguage();
  const { tick } = useStoreManager();
  const [open, setOpen] = useState<Key | null>(toKey(route.params?.open));
  const [kyc, setKyc] = useState<KycStatus | null>(null);
  const [pickup, setPickup] = useState<Pickup['status'] | null>(null);
  const scroll = useRef<any>(null);

  const place = headerLocation(info, user?.location);

  useEffect(() => { const k = toKey(route.params?.open); if (k) setOpen(k); }, [route.params?.open, route.params?.at]);
  useEffect(() => { scroll.current?.scrollTo?.({ y: 0, animated: false }); }, [open]);
  useEffect(() => {
    if (!open || !focused) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { setOpen(null); return true; });
    return () => sub.remove();
  }, [open, focused]);
  useEffect(() => navigation.addListener('tabPress', () => { if (open && navigation.isFocused()) setOpen(null); }), [navigation, open]);
  useEffect(() => {
    if (open) return;
    kycService.get().then((d) => setKyc(d.status)).catch(() => {});
    smService.pickup().then((p) => setPickup(p.status)).catch(() => {});
  }, [open, tick]);

  const logout = async () => {
    const r = await WonPetsAlert.logout('Log out?', 'You will need to sign in again to manage your store.');
    if (r.isConfirmed) signOut();
  };

  const todo: { key: Key; label: string }[] = [];
  if (!user?.email || !user?.phone) todo.push({ key: 'profile', label: !user?.email ? 'Add email' : 'Add mobile' });
  if (ready && (!info.storeName?.trim() || !info.location)) todo.push({ key: 'store', label: 'Store details' });
  if (ready && STORE_DOCUMENT_TYPES.some((d) => !documents[d.key])) todo.push({ key: 'documents', label: 'Upload documents' });
  if (kyc && kyc !== 'activated' && kyc !== 'under_review') todo.push({ key: 'kyc', label: 'Complete KYC' });
  if (pickup === 'failed' || pickup === 'pending_verification') todo.push({ key: 'pickup', label: 'Check pickup address' });

  const docsDone = STORE_DOCUMENT_TYPES.filter((d) => documents[d.key]).length;
  const rowValue = (it: Item): { text?: string; chip?: { label: string; tone: Tone } ; badge?: { label: string; tone: 'slate' | 'amber' | 'green' | 'red' } } => {
    if (it.kind !== 'page') return {};
    if (it.key === 'kyc' && kyc) return { chip: KYC_STATUS[kyc] };
    if (it.key === 'pickup' && pickup) return { badge: PICKUP_STATUS[pickup] };
    if (it.key === 'documents' && ready) return { text: `${docsDone}/${STORE_DOCUMENT_TYPES.length}` };
    if (it.key === 'language') return { text: language.label };
    return {};
  };

  const renderRow = (it: Item, index: number) => {
    const t = MENU_TONE[it.tone];
    const v = rowValue(it);
    return (
      <Pressable key={it.kind === 'page' ? it.key : it.route} onPress={() => (it.kind === 'page' ? setOpen(it.key) : navigation.navigate(it.route))}
        accessibilityRole="button" accessibilityLabel={it.title} className={cn('flex-row items-center gap-3 px-3.5 py-3 active:bg-cream', index > 0 && 'border-t border-line')}>
        <View className={cn('w-10 h-10 rounded-xl items-center justify-center', t.box)}><Ionicons name={it.icon} size={19} color={t.fg} /></View>
        <View className="flex-1">
          <Text maxFontSizeMultiplier={1.1} numberOfLines={1} className="text-[15px] font-extrabold text-ink">{it.title}</Text>
          <Text maxFontSizeMultiplier={1.1} numberOfLines={1} className="text-[12px] text-muted">{it.hint}</Text>
        </View>
        {!!v.chip && <Chip label={v.chip.label} tone={v.chip.tone} />}
        {!!v.badge && <Badge label={v.badge.label} tone={v.badge.tone} />}
        {!!v.text && <Text maxFontSizeMultiplier={1.1} numberOfLines={1} className="text-[12px] font-semibold text-muted max-w-[90px]">{v.text}</Text>}
        <Ionicons name="chevron-forward" size={18} color={colors.muted} />
      </Pressable>
    );
  };
  const group = (title: string, items: Item[]) => (
    <View key={title}>
      <Text maxFontSizeMultiplier={1.1} className="text-[12px] font-extrabold text-muted uppercase tracking-wider mb-1.5 ml-2">{title}</Text>
      <View className="bg-white rounded-3xl border border-orange-100 overflow-hidden">{items.map(renderRow)}</View>
    </View>
  );

  const body = () => {
    if (!open) return null;
    if (!ready && SERVER_BACKED.includes(open)) return <Card className="border-orange-100"><FormSkeleton fields={3} /></Card>;
    const el = {
      profile: <DoctorProfileForm />,
      store: <StoreDetailsSection />,
      pickup: <PickupSection onOpenStore={() => setOpen('store')} onStatus={setPickup} />,
      kyc: <KycSection onStatus={setKyc} />,
      documents: <DocumentsSection types={STORE_DOCUMENT_TYPES} />,
      prefs: <NotificationsSection only={STORE_NOTIFICATION_KEYS} />,
      language: <LanguageSection />,
      faq: <FaqSection fallback={STORE_FAQS} />,
      support: <ContactSection />,
    }[open];
    return NO_CARD.includes(open) ? el : <Card className="border-orange-100">{el}</Card>;
  };

  return (
    <View className="flex-1 bg-cream">
      <View style={{ paddingTop: insets.top + 8 }} className="px-4 pb-2.5 bg-cream border-b border-line">
        <View className="flex-row items-center h-[38px]">
          {open ? (
            <Pressable onPress={() => setOpen(null)} hitSlop={8} accessibilityRole="button" accessibilityLabel="Back" className="w-[38px] h-[38px] rounded-xl bg-white border border-line items-center justify-center active:opacity-70">
              <Ionicons name="arrow-back" size={19} color={colors.text} />
            </Pressable>
          ) : <View className="w-[38px]" />}
          <Text maxFontSizeMultiplier={1.1} numberOfLines={1} className="flex-1 text-center text-[19px] font-black text-ink px-2">{open ? sections[open].title : 'Profile'}</Text>
          <View className="w-[38px]" />
        </View>
      </View>

      <ScrollView ref={scroll} className="flex-1" contentContainerClassName="p-4 gap-3.5 pb-10" keyboardShouldPersistTaps="handled">
        {open ? body() : (
          <>
            <Pressable onPress={() => setOpen('profile')} accessibilityRole="button" accessibilityLabel="Edit profile" className="flex-row items-center gap-3 bg-white rounded-3xl border border-orange-100 p-3.5 active:opacity-80">
              <View className="rounded-full p-0.5 bg-orange-300"><View className="rounded-full bg-white p-0.5"><Avatar image={user?.profileImage} emoji="🏪" size={60} /></View></View>
              <View className="flex-1">
                <Text maxFontSizeMultiplier={1.1} numberOfLines={1} className="text-[18px] font-black text-ink">{user?.name ?? 'Store manager'}</Text>
                <Text maxFontSizeMultiplier={1.1} numberOfLines={1} className="text-[12px] text-muted">{user?.email || user?.phone}</Text>
                <View className="flex-row items-center gap-2 mt-1.5">
                  <Chip label={info.storeName?.trim() || 'Store Manager'} tone="orange" />
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

            {todo.length > 0 && (
              <View className="bg-primary-soft rounded-3xl border border-orange-100 p-3.5 gap-2.5">
                <View className="flex-row items-center gap-2"><Ionicons name="sparkles-outline" size={16} color={colors.primary} /><Text className="flex-1 text-[14px] font-extrabold text-ink">Finish setting up your store</Text></View>
                <View className="flex-row flex-wrap gap-2">{todo.map((t) => <Chip key={t.key} tone="white" label={`+ ${t.label}`} onPress={() => setOpen(t.key)} />)}</View>
              </View>
            )}

            {group('Your store', STORE)}
            {group('Account', ACCOUNT)}
            {group('Preferences', PREFS)}
            {group('Help & Support', HELP)}

            <Pressable onPress={logout} accessibilityRole="button" accessibilityLabel="Logout" className="flex-row items-center justify-center gap-2 bg-red-soft border border-red/20 rounded-2xl py-3.5 active:opacity-80">
              <Ionicons name="log-out-outline" size={19} color={colors.red} />
              <Text className="text-red font-extrabold text-[15px]">Logout</Text>
            </Pressable>
            <Text className="text-center text-xs text-muted">WON PET STORE · v1.1.0</Text>
          </>
        )}
      </ScrollView>
    </View>
  );
}

import React, { useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';
import { Button, Field, cn } from '../../components/ui';
import { Photo } from '../../components/Avatar';
import CustomDropdown from '../../components/CustomDropdown';
import DateFields from '../../components/DateFields';
import { FormSkeleton } from '../../components/Skeletons';
import { WonPetsAlert, toast } from '../../components/WonPetsAlert';
import BottomSheet from '../../components/common/BottomSheet';
import SearchBar from '../../components/common/SearchBar';
import { FormCard } from '../../components/doctor/ProfileBits';
import { ChoiceRow, FieldLabel, ImagePickerGrid, OfferBadge, SwitchRow, inr0 } from '../../components/storeManager/SMUI';
import { THEME_COLORS } from './SMOffersScreen';
import { errorMessage } from '../../services/api';
import { OfferInput, SMCategory, SMOffer, SMProduct, emptyOffer, offerToInput, smService } from '../../services/storeManager.service';
import { useStoreManager } from '../../context/StoreManagerContext';

const REDIRECTS = [
  { value: 'store', label: 'Store (offer products)' },
  { value: 'category', label: 'Category' },
  { value: 'product', label: 'Product(s)' },
  { value: 'external', label: 'External link' },
];
const numOnly = (v: string) => v.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1');
const intOnly = (v: string) => v.replace(/[^\d]/g, '');

/** Create or edit a coupon / offer banner (web OffersPage drawer). Params: { id? }. */
export default function SMOfferFormScreen({ navigation, route }: any) {
  const id: string | undefined = route.params?.id;
  const insets = useSafeAreaInsets();
  const { syncNow } = useStoreManager();
  const [f, setF] = useState<OfferInput>(emptyOffer);
  const [offer, setOffer] = useState<SMOffer | null>(null);
  const [image, setImage] = useState<string[]>([]);
  const [categories, setCategories] = useState<SMCategory[]>([]);
  const [products, setProducts] = useState<SMProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pickOpen, setPickOpen] = useState(false);
  const [pickSearch, setPickSearch] = useState('');
  const [pickCat, setPickCat] = useState('');
  const set = (p: Partial<OfferInput>) => setF((x) => ({ ...x, ...p }));

  useEffect(() => { navigation.setOptions({ title: id ? 'Edit Offer' : 'Create Offer' }); }, [id, navigation]);
  useEffect(() => {
    (async () => {
      try {
        const [cats, prods, o] = await Promise.all([
          smService.categories().catch(() => []), smService.products().catch(() => []),
          id ? smService.offers().then((l) => l.find((x) => x.id === id) ?? smService.offer(id)) : Promise.resolve(null),
        ]);
        setCategories(cats); setProducts(prods);
        if (o) { setOffer(o); setF(offerToInput(o)); }
      } catch (e) { toast.error(errorMessage(e, 'Could not load the offer')); } finally { setLoading(false); }
    })();
  }, [id]);

  const accent = THEME_COLORS[f.theme] ?? THEME_COLORS.orange;
  const pickList = useMemo(() => {
    const k = pickSearch.trim().toLowerCase();
    return products.filter((p) => (!pickCat || p.categoryId === pickCat) && (!k || p.name.toLowerCase().includes(k)));
  }, [products, pickSearch, pickCat]);
  const toggleProduct = (pid: string) => set({ redirectProducts: f.redirectProducts.includes(pid) ? f.redirectProducts.filter((x) => x !== pid) : [...f.redirectProducts, pid] });

  const validate = (): string | null => {
    if (!f.title.trim()) return 'Offer title is required.';
    if (!f.code.trim()) return 'Coupon code is required.';
    if (!(Number(f.discount) > 0)) return 'Enter a discount greater than 0.';
    if (f.discountType === 'Percentage' && Number(f.discount) > 100) return 'A percentage discount cannot be more than 100.';
    if (!f.startDate || !f.endDate) return 'Choose both a start and an end date.';
    if (f.startDate > f.endDate) return 'The start date cannot be after the end date.';
    if (f.redirectType === 'category' && !f.redirectValue) return 'Choose the category this offer opens.';
    if (f.redirectType === 'product' && !f.redirectProducts.length) return 'Pick at least one product.';
    if (f.redirectType === 'external' && !/^https?:\/\//i.test(f.redirectValue.trim())) return 'Enter a full link starting with https://';
    return null;
  };

  const save = async () => {
    const err = validate();
    if (err) return WonPetsAlert.warning('Check the form', err);
    setSaving(true);
    try {
      const body = { ...f, code: f.code.trim().toUpperCase(), redirectValue: f.redirectValue.trim() };
      id ? await smService.updateOffer(id, body, image[0]) : await smService.createOffer(body, image[0]);
      toast.success(id ? 'Offer updated' : 'Offer created');
      syncNow();
      navigation.goBack();
    } catch (e) { WonPetsAlert.error('Could not save offer', errorMessage(e)); } finally { setSaving(false); }
  };
  const remove = async () => {
    if (!id) return;
    const r = await WonPetsAlert.delete('Delete offer?', 'This offer will be removed.', { confirmText: 'Yes, delete' });
    if (!r.isConfirmed) return;
    try { await smService.deleteOffer(id); toast.success('Offer deleted'); syncNow(); navigation.goBack(); }
    catch (e) { toast.error(errorMessage(e, 'Unable to delete offer')); }
  };

  if (loading) return <View className="flex-1 bg-cream p-4"><FormCard icon="pricetag-outline" title="Offer"><FormSkeleton fields={6} /></FormCard></View>;
  const previewImage = image[0] ?? offer?.productImage;

  return (
    <KeyboardAvoidingView className="flex-1 bg-cream" behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      <ScrollView contentContainerClassName="p-4 gap-4 pb-6" keyboardShouldPersistTaps="handled">
        {/* live preview of the store banner */}
        <View style={{ backgroundColor: accent }} className="rounded-3xl p-4 flex-row items-center gap-3 overflow-hidden">
          <View className="flex-1 gap-1">
            {!!f.highlight && <Text className="text-white/90 text-[11px] font-bold uppercase tracking-wider" numberOfLines={1}>{f.highlight}</Text>}
            <Text className="text-white text-[18px] font-black" numberOfLines={2}>{f.offerText || (f.discount ? (f.discountType === 'Flat' ? `FLAT ₹${f.discount} OFF` : `${f.discount}% OFF`) : 'Your offer')}</Text>
            <Text className="text-white/90 text-[12.5px]" numberOfLines={1}>{f.title || 'Offer title'}</Text>
            <View className="flex-row items-center gap-2 mt-1.5">
              <View className="bg-white rounded-full px-3 py-1.5"><Text style={{ color: accent }} className="font-extrabold text-[12px]">{f.buttonText || 'Shop Now'}</Text></View>
              {!!f.code && <View className="border border-dashed border-white rounded-lg px-2 py-1"><Text className="text-white font-black text-[11px] tracking-wider">{f.code.toUpperCase()}</Text></View>}
            </View>
          </View>
          {!!previewImage && <View className="w-[86px] h-[86px] rounded-2xl overflow-hidden bg-white/20"><Photo uri={previewImage} emojiSize={30} /></View>}
        </View>
        {!!offer && (
          <View className="flex-row items-center gap-2">
            <OfferBadge status={offer.status} />
            <Text className="text-xs text-muted">Used {offer.usedCount} of {offer.maxUsage || '∞'} times</Text>
          </View>
        )}

        <FormCard icon="information-circle-outline" title="Offer details">
          <Field label="Offer title" value={f.title} onChangeText={(title) => set({ title })} placeholder="Premium Pet Food Sale" />
          <Field label="Highlight" value={f.highlight} onChangeText={(highlight) => set({ highlight })} placeholder="Limited Time Offer" />
          <Field label="Description" value={f.description} onChangeText={(description) => set({ description })} placeholder="Describe the offer…" multiline numberOfLines={3} style={{ minHeight: 80, textAlignVertical: 'top' }} />
          <Field label="Coupon code" value={f.code} onChangeText={(code) => set({ code: code.replace(/\s/g, '').toUpperCase() })} placeholder="PETS20" autoCapitalize="characters" />
        </FormCard>

        <FormCard icon="pricetag-outline" title="Discount">
          <ChoiceRow label="Discount type" value={f.discountType} onChange={(discountType) => set({ discountType })}
            options={[{ key: 'Percentage', label: 'Percentage %', icon: 'trending-down' }, { key: 'Flat', label: 'Flat ₹', icon: 'cash-outline' }]} />
          <View className="flex-row gap-3">
            <Field className="flex-1" label={f.discountType === 'Flat' ? 'Discount (₹)' : 'Discount (%)'} value={f.discount} onChangeText={(v) => set({ discount: numOnly(v) })} keyboardType="decimal-pad" placeholder="0" />
            <Field className="flex-1" label="Minimum order (₹)" value={f.minimumOrderAmount} onChangeText={(v) => set({ minimumOrderAmount: numOnly(v) })} keyboardType="decimal-pad" placeholder="0" />
          </View>
          {f.discountType === 'Percentage' && (
            <Field label="Maximum discount (₹)" value={f.maximumDiscount} onChangeText={(v) => set({ maximumDiscount: numOnly(v) })} keyboardType="decimal-pad" placeholder="No cap" hint="Caps how much a percentage coupon can take off." />
          )}
          {Number(f.discount) > 0 && Number(f.minimumOrderAmount) > 0 && (
            <Text className="text-xs text-muted">e.g. on a {inr0(Number(f.minimumOrderAmount))} order the customer saves {inr0(f.discountType === 'Flat' ? Number(f.discount) : Math.min(Number(f.minimumOrderAmount) * Number(f.discount) / 100, Number(f.maximumDiscount) || Infinity))}.</Text>
          )}
        </FormCard>

        <FormCard icon="calendar-outline" title="Period & usage">
          <DateFields label="Start date" value={f.startDate} onChange={(startDate) => set({ startDate })} />
          <DateFields label="End date" value={f.endDate} onChange={(endDate) => set({ endDate })} min={f.startDate || undefined} />
          <View className="flex-row gap-3">
            <Field className="flex-1" label="Maximum usage" value={f.maxUsage} onChangeText={(v) => set({ maxUsage: intOnly(v) })} keyboardType="number-pad" placeholder="e.g. 100" />
            <Field className="flex-1" label="Usage per user" value={f.usagePerUser} onChangeText={(v) => set({ usagePerUser: intOnly(v) })} keyboardType="number-pad" placeholder="e.g. 1" />
          </View>
        </FormCard>

        <FormCard icon="color-palette-outline" title="Banner">
          <View>
            <FieldLabel>Theme</FieldLabel>
            <View className="flex-row gap-2.5">
              {Object.entries(THEME_COLORS).map(([k, c]) => (
                <Pressable key={k} onPress={() => set({ theme: k })} accessibilityLabel={`${k} theme`} style={{ backgroundColor: c }}
                  className={cn('w-10 h-10 rounded-full items-center justify-center', f.theme === k && 'border-[3px] border-ink')}>
                  {f.theme === k && <Ionicons name="checkmark" size={18} color="#fff" />}
                </Pressable>
              ))}
            </View>
          </View>
          <Field label="Offer text" value={f.offerText} onChangeText={(offerText) => set({ offerText })} placeholder="UP TO 50% OFF" />
          <Field label="Button text" value={f.buttonText} onChangeText={(buttonText) => set({ buttonText })} placeholder="Shop Now" />
          <Field label="Features" value={f.features} onChangeText={(features) => set({ features })} placeholder="Free Shipping, Premium Quality, Best Seller" hint="Separate multiple features with commas." />
          <ImagePickerGrid existing={offer?.productImage ? [offer.productImage] : []} picked={image} onChange={setImage} max={1} label="Banner image" />
        </FormCard>

        <FormCard icon="navigate-outline" title="Where the banner opens">
          <CustomDropdown value={f.redirectType} onChange={(redirectType) => set({ redirectType, redirectValue: '', redirectProducts: [] })} options={REDIRECTS} searchable={false} title="Redirect type" />
          {f.redirectType === 'store' && <Text className="text-xs text-muted">Customers will see all products of your store that are on offer. Nothing else needed.</Text>}
          {f.redirectType === 'category' && (
            <CustomDropdown value={f.redirectValue} onChange={(redirectValue) => set({ redirectValue })} options={categories.map((c) => ({ value: c.id, label: c.name }))} placeholder="Select a category" title="Category" />
          )}
          {f.redirectType === 'product' && (
            <Pressable onPress={() => setPickOpen(true)} className="flex-row items-center gap-3 border-[1.5px] border-line rounded-2xl px-4 py-3.5 bg-white active:bg-cream">
              <Ionicons name="cube-outline" size={18} color={colors.primary} />
              <Text className="flex-1 text-[15px] text-ink" numberOfLines={1}>
                {f.redirectProducts.length ? `${f.redirectProducts.length} product${f.redirectProducts.length > 1 ? 's' : ''} selected` : 'Select products'}
              </Text>
              <Ionicons name="chevron-forward" size={18} color={colors.muted} />
            </Pressable>
          )}
          {f.redirectType === 'external' && (
            <Field value={f.redirectValue} onChangeText={(redirectValue) => set({ redirectValue })} placeholder="https://example.com" autoCapitalize="none" keyboardType="url" />
          )}
        </FormCard>

        <SwitchRow title="Offer status" hint={f.isActive ? 'Enabled — customers can use it in its period' : 'Disabled — hidden from customers'} value={f.isActive} onChange={(isActive) => set({ isActive })} />

        {!!id && (
          <Pressable onPress={remove} className="flex-row items-center justify-center gap-2 bg-red-soft border border-red/20 rounded-2xl py-3.5 active:opacity-80">
            <Ionicons name="trash-outline" size={18} color={colors.red} /><Text className="text-red font-extrabold">Delete offer</Text>
          </Pressable>
        )}
      </ScrollView>

      <View style={{ paddingBottom: Math.max(insets.bottom, 12) }} className="px-4 pt-3 bg-white border-t border-line">
        <Button disabled={saving} title={saving ? 'Saving…' : id ? 'Save Changes' : 'Create Offer'} icon={<Ionicons name="checkmark-circle-outline" size={19} color="#fff" />} onPress={save} />
      </View>

      {/* multi product picker */}
      <BottomSheet visible={pickOpen} onClose={() => setPickOpen(false)} title="Select products" subtitle={`${f.redirectProducts.length} selected`}
        footer={<Button title="Done" onPress={() => setPickOpen(false)} />}>
        <SearchBar value={pickSearch} onChangeText={setPickSearch} placeholder="Search products…" />
        <CustomDropdown value={pickCat} onChange={setPickCat} options={[{ value: '', label: 'All categories' }, ...categories.map((c) => ({ value: c.id, label: c.name }))]} placeholder="All categories" title="Filter by category" />
        <View className="bg-white rounded-3xl border border-line overflow-hidden">
          {pickList.length ? pickList.map((p, i) => {
            const on = f.redirectProducts.includes(p.id);
            return (
              <Pressable key={p.id} onPress={() => toggleProduct(p.id)} className={cn('flex-row items-center gap-3 px-3.5 py-3 active:bg-cream', i > 0 && 'border-t border-line')}>
                <Ionicons name={on ? 'checkbox' : 'square-outline'} size={22} color={on ? colors.primary : colors.muted} />
                <View className="flex-1">
                  <Text className="font-semibold text-ink" numberOfLines={1}>{p.name}</Text>
                  <Text className="text-xs text-muted">{inr0(p.price)}{p.discount > 0 ? ` · ${p.discount}% off` : ''}</Text>
                </View>
              </Pressable>
            );
          }) : <Text className="text-center text-muted p-5">No products found</Text>}
        </View>
      </BottomSheet>
    </KeyboardAvoidingView>
  );
}

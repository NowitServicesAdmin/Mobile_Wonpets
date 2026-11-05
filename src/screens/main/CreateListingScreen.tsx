import React, { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, Switch, Text, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { colors } from '../../theme';
import { Button, Field, T, cn } from '../../components/ui';
import { toast } from '../../components/WonPetsAlert';
import { AGE_OPTIONS, BREED_SUGGESTIONS, CATEGORY_EMOJI, CONDITIONS, Condition, PET_CATEGORIES, PRODUCT_CATEGORIES } from '../../data/resell';
import { useResell } from '../../context/ResellContext';
import { inr } from '../../utils/orders';

const STEPS = [
  { label: 'Details', title: 'Tell us about it', sub: 'Basic information buyers will see first.', icon: 'document-text' },
  { label: 'Photos', title: 'Add photos', sub: 'Good photos get far more enquiries.', icon: 'camera' },
  { label: 'Price', title: 'Price & condition', sub: 'Set a fair price and review your listing.', icon: 'pricetag' },
] as const;
const Label = ({ children }: { children: string }) => <Text className="font-bold text-ink mb-2">{children}</Text>;
const Opt = ({ label, on, onPress, plain }: { label: string; on: boolean; onPress: () => void; plain?: boolean }) => (
  <Pressable onPress={onPress} className={cn('px-3.5 py-2 rounded-full border active:opacity-80', on ? 'bg-primary border-primary' : plain ? 'bg-primary-soft border-primary-soft' : 'bg-white border-line')}>
    <Text className={cn('text-xs font-bold', on ? 'text-white' : 'text-ink')}>{label}</Text>
  </Pressable>
);
const Panel = ({ children, className }: { children: React.ReactNode; className?: string }) => <View className={cn('bg-white rounded-3xl border border-line p-4 gap-4', className)}>{children}</View>;
/** 3-step sell wizard (same steps and validation as the web). Pass { id } to edit an existing listing. */
export default function CreateListingScreen({ route, navigation }: any) {
  const { listings, createListing, updateListing } = useResell();
  const editing = listings.find((l) => l.id === route.params?.id);
  const [step, setStep] = useState(1);
  const [type, setType] = useState<'Pet' | 'Product'>(editing?.listingType ?? 'Pet');
  const [title, setTitle] = useState(editing?.title ?? '');
  const [category, setCategory] = useState(editing?.category ?? '');
  const [custom, setCustom] = useState(editing?.customCategory ?? '');
  const [saving, setSaving] = useState(false);
  const [breed, setBreed] = useState(editing?.breed ?? '');
  const [age, setAge] = useState(editing?.age ?? '');
  const [gender, setGender] = useState<'Male' | 'Female'>(editing?.gender ?? 'Male');
  const [brand, setBrand] = useState(editing?.brand ?? '');
  const [description, setDescription] = useState(editing?.description ?? '');
  const [location, setLocation] = useState(editing?.location ?? '');
  const [photos, setPhotos] = useState<string[]>(editing?.photos ?? []);
  const [price, setPrice] = useState(editing ? String(editing.price) : '');
  const [original, setOriginal] = useState(editing?.originalPrice ? String(editing.originalPrice) : '');
  const [condition, setCondition] = useState<Condition>(editing?.condition ?? 'Good');
  const [quantity, setQuantity] = useState(editing?.quantity ?? 1);
  const [featured, setFeatured] = useState(editing?.isFeatured ?? false);
  const { width } = useWindowDimensions();
  const tile = Math.floor((width - 32 - 32 - 24) / 3);
  const cur = STEPS[step - 1];
  const discount = (original && price && Number(original) > Number(price) ? Math.round((1 - Number(price) / Number(original)) * 100) : 0);

  const addPhotos = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsMultipleSelection: true, selectionLimit: Math.max(1, 5 - photos.length), quality: 0.7 });
    if (!res.canceled) setPhotos((p) => [...p, ...res.assets.map((a) => a.uri)].slice(0, 5));
  };

  const validate = (s: number) => {
    if (s === 1) {
      if (!title.trim()) return toast.error('Please enter a title.'), false;
      if (!category) return toast.error(type === 'Pet' ? 'Please select a pet type.' : 'Please select a category.'), false;
      if (category === 'Others' && !custom.trim()) return toast.error('Please name the custom category.'), false;
      if (!description.trim()) return toast.error('Please add a description.'), false;
      if (!location.trim()) return toast.error('Please add a location.'), false;
    }
    if (s === 2 && photos.length === 0) return toast.error('Please add at least one photo.'), false;
    if (s === 3) {
      if (!price || Number(price) <= 0) return toast.error('Please enter a valid price.'), false;
      if (original && Number(original) < Number(price)) return toast.error('Original price should not be lower than your price.'), false;
    }
    return true;
  };

  const next = () => { if (validate(step)) setStep((s) => Math.min(3, s + 1)); };
  const submit = async () => {
    if (!validate(3) || saving) return;
    setSaving(true);
    const data = {
      listingType: type, title: title.trim(), category, customCategory: category === 'Others' ? custom.trim() : '',
      breed: type === 'Pet' ? breed.trim() : '', age: type === 'Pet' ? age : '', gender: type === 'Pet' ? gender : '',
      brand: type === 'Product' ? brand.trim() : '', condition, price: Number(price), originalPrice: original ? Number(original) : 0,
      quantity: type === 'Product' ? quantity : 1, location: location.trim(), description: description.trim(), isFeatured: featured, photos,
    };
    if (editing) {
      const ok = await updateListing(editing.id, data);
      setSaving(false);
      if (ok) { toast.success('Listing updated successfully.'); navigation.goBack(); }
    } else {
      const id = await createListing(data);
      setSaving(false);
      if (id) { toast.success('Listing published!'); navigation.replace('ListingDetail', { id }); }
    }
  };

  return (
    <KeyboardAvoidingView className="flex-1 bg-cream" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View className="px-5 pt-4 pb-4 bg-white border-b border-line gap-3.5">
        <View className="flex-row items-center gap-3">
          <View className="w-11 h-11 rounded-2xl bg-primary items-center justify-center"><Ionicons name={cur.icon} size={20} color="#fff" /></View>
          <View className="flex-1"><Text className="text-[11px] font-bold text-primary">STEP {step} OF 3{editing ? ' · EDITING' : ''}</Text><Text className={T.h2}>{cur.title}</Text></View>
        </View>
        <View className="flex-row gap-2">
          {STEPS.map((st, i) => {
            const n = i + 1;
            return (
              <Pressable key={st.label} onPress={() => n < step && setStep(n)} className="flex-1 gap-1.5">
                <View className={cn('h-1.5 rounded-full', step >= n ? 'bg-primary' : 'bg-line')} />
                <View className="flex-row items-center gap-1">{step > n && <Ionicons name="checkmark-circle" size={12} color={colors.primary} />}<Text className={cn('text-[10px] font-bold', step >= n ? 'text-primary-dark' : 'text-muted')}>{st.label}</Text></View>
              </Pressable>
            );
          })}
        </View>
        <Text className={T.small}>{cur.sub}</Text>
      </View>

      <ScrollView contentContainerClassName="p-4 gap-4 pb-8" keyboardShouldPersistTaps="handled">
        {step === 1 && (
          <>
            <Panel>
              <View><Label>What are you selling?</Label>
                <View className="flex-row gap-3">
                  {([['Pet', '🐾', 'Dogs, cats, birds…'], ['Product', '🛍️', 'Food, toys, gear…']] as const).map(([t, e, sub]) => (
                    <Pressable key={t} onPress={() => { setType(t); setCategory(''); }} className={cn('flex-1 items-center gap-1 py-4 rounded-2xl border-[1.5px] active:opacity-90', type === t ? 'border-primary bg-primary-soft' : 'border-line bg-white')}>
                      <Text style={{ fontSize: 30 }}>{e}</Text>
                      <Text className={cn('font-extrabold', type === t ? 'text-primary-dark' : 'text-ink')}>{t}</Text>
                      <Text className="text-[10px] text-muted">{sub}</Text>
                      {type === t && <View className="absolute top-2 right-2"><Ionicons name="checkmark-circle" size={18} color={colors.primary} /></View>}
                    </Pressable>
                  ))}
                </View>
              </View>
              <Field label="Title *" value={title} onChangeText={setTitle} placeholder={type === 'Pet' ? 'e.g. Golden Retriever pup, 3 months' : 'e.g. Cat tree tower, 5 ft'} />
            </Panel>

            <Panel>
              <View><Label>{type === 'Pet' ? 'Pet type *' : 'Category *'}</Label>
                <View className="flex-row flex-wrap gap-2">{(type === 'Pet' ? PET_CATEGORIES : PRODUCT_CATEGORIES).map((c) => <Opt key={c} label={`${CATEGORY_EMOJI[c]} ${c}`} on={category === c} onPress={() => { setCategory(c); setBreed(''); }} />)}</View>
                {category === 'Others' && <Field className="mt-3" placeholder="Name the category" value={custom} onChangeText={setCustom} />}
              </View>
              {type === 'Pet' ? (
                <>
                  <View><Field label="Breed" value={breed} onChangeText={setBreed} placeholder="e.g. Labrador Retriever" />
                    {!!BREED_SUGGESTIONS[category] && <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2 mt-2">{BREED_SUGGESTIONS[category].map((b) => <Opt key={b} plain label={b} on={breed === b} onPress={() => setBreed(b)} />)}</ScrollView>}
                  </View>
                  <View><Label>Age</Label><View className="flex-row flex-wrap gap-2">{AGE_OPTIONS.map((a) => <Opt key={a} label={a} on={age === a} onPress={() => setAge(a)} />)}</View></View>
                  <View><Label>Gender</Label>
                    <View className="flex-row gap-3">{(['Male', 'Female'] as const).map((g) => (
                      <Pressable key={g} onPress={() => setGender(g)} className={cn('flex-1 flex-row items-center justify-center gap-2 py-3 rounded-2xl border-[1.5px]', gender === g ? 'border-primary bg-primary-soft' : 'border-line bg-white')}>
                        <Ionicons name={g === 'Male' ? 'male' : 'female'} size={16} color={gender === g ? colors.primary : colors.muted} /><Text className={cn('font-bold', gender === g ? 'text-ink' : 'text-muted')}>{g}</Text>
                      </Pressable>
                    ))}</View>
                  </View>
                </>
              ) : <Field label="Brand" value={brand} onChangeText={setBrand} placeholder="Optional" />}
            </Panel>

            <Panel>
              <Field label="Description *" value={description} onChangeText={setDescription} placeholder="Health, behaviour, what's included, why you're selling…" multiline numberOfLines={4} />
              <Field label="Location *" value={location} onChangeText={setLocation} placeholder="Area, city" />
            </Panel>
          </>
        )}

        {step === 2 && (
          <>
            {photos.length === 0 ? (
              <Pressable onPress={addPhotos} className="items-center gap-3 py-12 rounded-[28px] border-2 border-dashed border-primary bg-primary-soft active:opacity-90">
                <View className="w-16 h-16 rounded-full bg-white items-center justify-center"><Ionicons name="cloud-upload" size={30} color={colors.primary} /></View>
                <View className="items-center"><Text className="text-primary-dark font-extrabold text-base">Tap to add photos</Text><Text className={T.small}>Up to 5 photos · first one is the cover</Text></View>
              </Pressable>
            ) : (
              <Panel>
                <View className="flex-row flex-wrap gap-3">
                  {photos.map((u, i) => (
                    <View key={u} style={{ width: tile, height: tile }}>
                      <Image source={{ uri: u }} style={{ width: tile, height: tile }} className="rounded-2xl" />
                      {i === 0 && <View className="absolute bottom-1.5 left-1.5 bg-primary rounded-full px-2 py-0.5 flex-row items-center gap-1"><Ionicons name="star" size={9} color="#fff" /><Text className="text-white text-[10px] font-bold">Cover</Text></View>}
                      <Pressable onPress={() => setPhotos((p) => p.filter((x) => x !== u))} className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-red items-center justify-center"><Ionicons name="close" size={14} color="#fff" /></Pressable>
                    </View>
                  ))}
                  {photos.length < 5 && <Pressable onPress={addPhotos} style={{ width: tile, height: tile }} className="rounded-2xl border-[1.5px] border-dashed border-primary bg-primary-soft items-center justify-center gap-1"><Ionicons name="add-circle" size={26} color={colors.primary} /><Text className="text-primary text-xs font-bold">Add</Text></Pressable>}
                </View>
              </Panel>
            )}
            <View className="flex-row items-center justify-between">
              <Text className={T.small}>{photos.length}/5 added</Text>
              <View className="flex-row gap-1">{[0, 1, 2, 3, 4].map((i) => <View key={i} className={cn('w-6 h-1.5 rounded-full', i < photos.length ? 'bg-primary' : 'bg-line')} />)}</View>
            </View>
            <View className="flex-row gap-3 bg-primary-soft rounded-2xl p-3.5">
              <Ionicons name="bulb" size={18} color={colors.primary} />
              <Text className="flex-1 text-xs text-ink leading-5">Use natural light and show the {type === 'Pet' ? 'pet from a few angles' : 'item from every side, including any wear'}.</Text>
            </View>
          </>
        )}

        {step === 3 && (
          <>
            <Panel>
              <View className="flex-row gap-3"><Field className="flex-1" label="Price (₹) *" keyboardType="number-pad" value={price} onChangeText={(v) => setPrice(v.replace(/\D/g, ''))} placeholder="0" /><Field className="flex-1" label="Original price (₹)" keyboardType="number-pad" value={original} onChangeText={(v) => setOriginal(v.replace(/\D/g, ''))} placeholder="Optional" /></View>
              {discount > 0 && <View className="flex-row items-center gap-2 bg-green-soft rounded-xl px-3 py-2"><Ionicons name="trending-down" size={16} color={colors.green} /><Text className="text-green text-xs font-bold">Buyers will see {discount}% off</Text></View>}
              <View><Label>Condition</Label><View className="flex-row flex-wrap gap-2">{CONDITIONS.map((c) => <Opt key={c} label={c} on={condition === c} onPress={() => setCondition(c)} />)}</View></View>
              {type === 'Product' && (
                <View><Label>Quantity</Label>
                  <View className="flex-row items-center self-start bg-cream rounded-full border border-line">
                    <Pressable onPress={() => setQuantity((q) => Math.max(1, q - 1))} className="w-11 h-11 items-center justify-center"><Ionicons name="remove" size={18} color={colors.text} /></Pressable>
                    <Text className="text-lg font-extrabold min-w-[36px] text-center">{quantity}</Text>
                    <Pressable onPress={() => setQuantity((q) => q + 1)} className="w-11 h-11 items-center justify-center"><Ionicons name="add" size={18} color={colors.text} /></Pressable>
                  </View>
                </View>
              )}
            </Panel>

            <View className="flex-row items-center gap-3 bg-white rounded-3xl border border-line p-4">
              <View className="w-11 h-11 rounded-2xl bg-yellow-soft items-center justify-center"><Ionicons name="star" size={20} color={colors.yellow} /></View>
              <View className="flex-1"><Text className={T.h3}>Feature this listing</Text><Text className={T.small}>Shown in the Featured section for more views.</Text></View>
              <Switch value={featured} onValueChange={setFeatured} trackColor={{ true: colors.primary }} />
            </View>

            <View className="bg-white rounded-3xl border border-line p-3 gap-3">
              <Text className="text-[11px] font-bold text-muted px-1">PREVIEW</Text>
              <View className="flex-row gap-3">
                <View className="w-[88px] h-[88px] rounded-2xl bg-[#FBF3EA] items-center justify-center overflow-hidden">{photos[0] ? <Image source={{ uri: photos[0] }} className="w-full h-full" /> : <Text style={{ fontSize: 38 }}>{CATEGORY_EMOJI[category] ?? '📦'}</Text>}</View>
                <View className="flex-1 justify-between py-0.5">
                  <View className="gap-1">
                    <View className="self-start bg-primary-soft rounded-full px-2 py-[2px]"><Text className="text-primary-dark text-[10px] font-extrabold">{(category === 'Others' && custom ? custom : category || 'Category').toUpperCase()}</Text></View>
                    <Text className={T.h3} numberOfLines={2}>{title || 'Your title'}</Text>
                  </View>
                  <Text className="text-xl font-black text-ink">{price ? inr(Number(price)) : '₹0'}</Text>
                </View>
              </View>
              <View className="flex-row bg-cream rounded-xl py-2.5">
                <View className="flex-1 flex-row items-center justify-center gap-1.5"><Ionicons name="location" size={13} color={colors.primary} /><Text className="text-xs text-ink" numberOfLines={1}>{location ? location.split(',')[0] : 'Location'}</Text></View>
                <View className="w-px bg-line" />
                <View className="flex-1 flex-row items-center justify-center gap-1.5"><Ionicons name="images" size={13} color={colors.primary} /><Text className="text-xs text-ink">{photos.length} photo{photos.length === 1 ? '' : 's'} · {condition}</Text></View>
              </View>
            </View>
          </>
        )}
      </ScrollView>

      <View className="flex-row gap-3 p-4 bg-white border-t border-line">
        {step > 1 && <Button className="flex-1" variant="neutral" title="Back" icon={<Ionicons name="arrow-back" size={17} color={colors.text} />} onPress={() => setStep((s) => s - 1)} />}
        {step < 3 ? <Button className="flex-[2]" title="Next" icon={<Ionicons name="arrow-forward" size={17} color="#fff" />} onPress={next} /> : <Button className="flex-[2]" title={saving ? 'Saving…' : editing ? 'Save changes' : 'Publish listing'} icon={<Ionicons name="rocket" size={17} color="#fff" />} disabled={saving} onPress={submit} />}
      </View>
    </KeyboardAvoidingView>
  );
}

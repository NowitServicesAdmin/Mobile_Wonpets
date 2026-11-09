import React, { useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button, Field } from '../../components/ui';
import CustomDropdown from '../../components/CustomDropdown';
import { FormSkeleton } from '../../components/Skeletons';
import { WonPetsAlert, toast } from '../../components/WonPetsAlert';
import { FormCard, Notice } from '../../components/doctor/ProfileBits';
import { ChoiceRow, FieldLabel, ImagePickerGrid, inr0 } from '../../components/storeManager/SMUI';
import { errorMessage } from '../../services/api';
import { ProductInput, SMCategory, emptyProduct, smService } from '../../services/storeManager.service';
import { useStoreManager } from '../../context/StoreManagerContext';

const numOnly = (v: string, decimals = true) => (decimals ? v.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1') : v.replace(/[^\d]/g, ''));

/** Add or edit a product / pet listing (web Products page "Add Product" + "Edit Product" drawers). Params: { id?, category? }. */
export default function SMProductFormScreen({ navigation, route }: any) {
  const id: string | undefined = route.params?.id;
  const insets = useSafeAreaInsets();
  const { syncNow } = useStoreManager();
  const [f, setF] = useState<ProductInput>({ ...emptyProduct, category: route.params?.category ?? '' });
  const [categories, setCategories] = useState<SMCategory[]>([]);
  const [existing, setExisting] = useState<string[]>([]);
  const [picked, setPicked] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const set = (p: Partial<ProductInput>) => setF((x) => ({ ...x, ...p }));

  useEffect(() => { navigation.setOptions({ title: id ? 'Edit Product' : 'Add Product' }); }, [id, navigation]);
  useEffect(() => {
    (async () => {
      try {
        const [cats, prod] = await Promise.all([smService.categories(), id ? smService.product(id) : Promise.resolve(null)]);
        setCategories(cats);
        if (prod) {
          setF({
            itemType: prod.itemType, name: prod.name, category: prod.categoryId, price: prod.price ? String(prod.price) : '',
            discount: prod.discount ? String(prod.discount) : '', stock: String(prod.stock), weight: prod.weight ? String(prod.weight) : '',
            status: prod.status, description: prod.description, breed: prod.breed, age: prod.age, gender: prod.gender,
          });
          setExisting(prod.images);
        }
      } catch (e) {
        toast.error(errorMessage(e, 'Could not load the product.'));
      } finally { setLoading(false); }
    })();
  }, [id]);

  const options = useMemo(() => {
    const name = (cid: string) => categories.find((c) => c.id === cid)?.name;
    return [...categories]
      .sort((a, b) => (a.type === f.itemType ? 0 : 1) - (b.type === f.itemType ? 0 : 1) || a.name.localeCompare(b.name))
      .map((c) => ({ value: c.id, label: `${c.parent ? `${name(c.parent) ?? ''} › ` : ''}${c.name}${c.type === 'pet' ? '  🐾' : ''}` }));
  }, [categories, f.itemType]);

  const price = Number(f.price || 0);
  const discount = Number(f.discount || 0);
  const finalPrice = price - (price * discount) / 100;

  const createCategory = async (label: string) => {
    try {
      const res = await smService.createCategory({ name: label, description: '', type: f.itemType, parent: '' });
      const cats = await smService.categories();
      setCategories(cats);
      const made = cats.find((c) => c.name.toLowerCase() === label.toLowerCase());
      if (made) set({ category: made.id });
      toast.success(res.message || 'Category created');
    } catch (e) { toast.error(errorMessage(e, 'Failed to create category')); }
  };

  const validate = (): string | null => {
    if (!f.name.trim()) return 'Product name is required.';
    if (!f.category) return 'Please choose a category.';
    if (!(price > 0)) return 'Price must be greater than 0.';
    if (f.stock === '' || Number(f.stock) < 0) return 'Enter the stock quantity (0 or more).';
    if (discount < 0 || discount > 100) return 'Discount must be between 0 and 100.';
    if (f.weight && !(Number(f.weight) >= 0)) return 'Weight must be a number in kg.';
    if (f.itemType === 'pet') {
      if (!f.breed.trim()) return 'Breed is required for pets.';
      if (!f.age.trim()) return 'Age is required for pets.';
      if (!f.gender) return 'Gender is required for pets.';
    }
    return null;
  };

  const save = async () => {
    const err = validate();
    if (err) return WonPetsAlert.warning('Check the form', err);
    if (id && picked.length && existing.length) {
      const r = await WonPetsAlert.confirm('Replace photos?', 'The new photos will replace all current photos of this product.', { confirmText: 'Replace' });
      if (!r.isConfirmed) return;
    }
    setSaving(true);
    try {
      const res = id ? await smService.updateProduct(id, f, picked) : await smService.createProduct(f, picked);
      toast.success(res.message || (id ? 'Product updated' : 'Product added'));
      syncNow();
      navigation.goBack();
    } catch (e) {
      WonPetsAlert.error(id ? 'Update failed' : 'Could not add product', errorMessage(e));
    } finally { setSaving(false); }
  };

  if (loading) return <View className="flex-1 bg-cream p-4"><FormCard icon="cube-outline" title="Product"><FormSkeleton fields={6} /></FormCard></View>;

  return (
    <KeyboardAvoidingView className="flex-1 bg-cream" behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      <ScrollView contentContainerClassName="p-4 gap-4 pb-6" keyboardShouldPersistTaps="handled">
        <FormCard icon="information-circle-outline" title="Basic details">
          <ChoiceRow label="Item type" value={f.itemType} onChange={(itemType) => set({ itemType })}
            options={[{ key: 'product', label: 'Product', icon: 'cube-outline' }, { key: 'pet', label: 'Pet', icon: 'paw-outline' }]} />
          {f.itemType === 'pet' && (
            <Notice tone="info" icon="paw">Pets are not bought or delivered through the app. Pet owners will contact you using the phone number and email on your profile — you and the buyer agree on delivery and payment.</Notice>
          )}
          <Field label={f.itemType === 'pet' ? 'Listing name' : 'Product name'} value={f.name} onChangeText={(name) => set({ name })} placeholder={f.itemType === 'pet' ? 'e.g. Golden Retriever puppy' : 'e.g. Premium Dog Food 3kg'} />
          <View>
            <FieldLabel>Category</FieldLabel>
            <CustomDropdown value={f.category} onChange={(category) => set({ category })} options={options} placeholder="Select category" title="Choose a category"
              onCreate={createCategory} createLabel="Create category" />
          </View>
          <ChoiceRow label="Status" value={f.status} onChange={(status) => set({ status })}
            options={[{ key: 'Active', label: 'Active', icon: 'eye-outline' }, { key: 'Inactive', label: 'Hidden', icon: 'eye-off-outline' }]} />
        </FormCard>

        {f.itemType === 'pet' && (
          <FormCard icon="paw-outline" title="Pet details">
            <Field label="Breed" value={f.breed} onChangeText={(breed) => set({ breed })} placeholder="e.g. Labrador" />
            <Field label="Age" value={f.age} onChangeText={(age) => set({ age })} placeholder="e.g. 3 months" />
            <ChoiceRow<string> label="Gender" value={f.gender} onChange={(gender) => set({ gender })}
              options={[{ key: 'Male', label: 'Male', icon: 'male' }, { key: 'Female', label: 'Female', icon: 'female' }]} />
          </FormCard>
        )}

        <FormCard icon="pricetag-outline" title="Pricing & stock">
          <View className="flex-row gap-3">
            <Field className="flex-1" label="Price (₹)" value={f.price} onChangeText={(v) => set({ price: numOnly(v) })} keyboardType="decimal-pad" placeholder="0" />
            <Field className="flex-1" label="Discount (%)" value={f.discount} onChangeText={(v) => set({ discount: numOnly(v) })} keyboardType="decimal-pad" placeholder="0" />
          </View>
          {price > 0 && (
            <View className="flex-row items-center justify-between rounded-2xl bg-green-50 border border-green-100 px-3.5 py-2.5">
              <Text className="text-[13px] text-slate-600">Customers pay</Text>
              <View className="flex-row items-center gap-2">
                {discount > 0 && <Text className="text-xs text-slate-400 line-through">{inr0(price)}</Text>}
                <Text className="text-[17px] font-black text-green-600">{inr0(Math.max(0, finalPrice))}</Text>
              </View>
            </View>
          )}
          <View className="flex-row gap-3">
            <Field className="flex-1" label={f.itemType === 'pet' ? 'Available' : 'Stock quantity'} value={f.stock} onChangeText={(v) => set({ stock: numOnly(v, false) })} keyboardType="number-pad" placeholder="0" />
            <Field className="flex-1" label="Weight (kg)" value={f.weight} onChangeText={(v) => set({ weight: numOnly(v) })} keyboardType="decimal-pad" placeholder="0" hint="Used for courier rates" />
          </View>
        </FormCard>

        <FormCard icon="images-outline" title="Photos & description">
          <ImagePickerGrid existing={existing} picked={picked} onChange={setPicked} max={4} label="Images (up to 4)"
            replaceHint={picked.length ? 'These new photos will replace the current ones when you save.' : 'Adding photos replaces the current set.'} />
          <Field label="Description" value={f.description} onChangeText={(description) => set({ description })} placeholder="Describe the item, ingredients, size, care…"
            multiline numberOfLines={5} style={{ minHeight: 110, textAlignVertical: 'top' }} />
        </FormCard>
      </ScrollView>

      <View style={{ paddingBottom: Math.max(insets.bottom, 12) }} className="px-4 pt-3 bg-white border-t border-line">
        <Button disabled={saving} title={saving ? 'Saving…' : id ? 'Save Changes' : f.itemType === 'pet' ? 'Add Pet' : 'Add Product'}
          icon={<Ionicons name={id ? 'checkmark-circle-outline' : 'add-circle-outline'} size={19} color="#fff" />} onPress={save} />
      </View>
    </KeyboardAvoidingView>
  );
}

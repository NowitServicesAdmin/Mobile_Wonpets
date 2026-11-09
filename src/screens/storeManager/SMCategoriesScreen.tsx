import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';
import { Button, Empty, Field, cn } from '../../components/ui';
import { WishlistSkeleton } from '../../components/Skeletons';
import { WonPetsAlert, toast } from '../../components/WonPetsAlert';
import SearchBar from '../../components/common/SearchBar';
import BottomSheet from '../../components/common/BottomSheet';
import CustomDropdown from '../../components/CustomDropdown';
import { TONES, DTone } from '../../components/doctor/DoctorUI';
import { Badge, ChoiceRow, Fab, FieldLabel, LoadError, RowAction } from '../../components/storeManager/SMUI';
import { useRemote } from '../../hooks/useRemote';
import { errorMessage } from '../../services/api';
import { CategoryInput, SMCategory, smService } from '../../services/storeManager.service';
import { useStoreManager } from '../../context/StoreManagerContext';

type Icon = keyof typeof Ionicons.glyphMap;
const ICONS: Record<string, [Icon, DTone]> = {
  'dog food': ['nutrition', 'orange'], 'cat food': ['fish', 'pink'], accessories: ['bag-handle', 'purple'], toys: ['football', 'blue'],
  grooming: ['cut', 'blue'], 'health care': ['medkit', 'green'], dogs: ['paw', 'amber'], cats: ['paw', 'pink'], birds: ['leaf', 'amber'], fish: ['water', 'blue'], pets: ['paw', 'orange'],
};
const iconFor = (name: string): [Icon, DTone] => ICONS[name.trim().toLowerCase()] ?? ['grid', 'orange'];
const blank: CategoryInput = { name: '', description: '', type: 'product', parent: '' };

/** Categories (web CategoriesPage): main categories with their pet subcategories, add / edit / delete, open a category's products. */
export default function SMCategoriesScreen({ navigation }: any) {
  const { tick } = useStoreManager();
  const q = useRemote(() => smService.categories(), [], tick);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<SMCategory | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<CategoryInput>(blank);
  const [saving, setSaving] = useState(false);

  const all = q.data ?? [];
  const mains = all.filter((c) => !c.parent);
  const petMains = mains.filter((c) => c.type === 'pet');
  const subsOf = (cid: string) => all.filter((c) => c.parent === cid);
  const parentName = (c: SMCategory) => all.find((x) => x.id === c.parent)?.name;
  // no search: main categories (subcategories show inside them); searching: everything
  const list = useMemo(() => (search.trim() ? all.filter((c) => c.name.toLowerCase().includes(search.trim().toLowerCase())) : mains), [all, mains, search]);

  const startAdd = (parent = '') => { setEditing(null); setForm({ ...blank, type: parent ? 'pet' : 'product', parent }); setOpen(true); };
  const startEdit = (c: SMCategory) => { setEditing(c); setForm({ name: c.name, description: c.description, type: c.type, parent: c.parent }); setOpen(true); };

  const save = async () => {
    if (!form.name.trim()) return toast.error('Category name is required');
    setSaving(true);
    try {
      const res = editing ? await smService.updateCategory(editing.id, form) : await smService.createCategory(form);
      toast.success(res.message || (editing ? 'Category updated' : 'Category created'));
      setOpen(false);
      q.reloadQuiet();
    } catch (e) { toast.error(errorMessage(e, 'Failed to save category')); } finally { setSaving(false); }
  };
  const remove = async (c: SMCategory) => {
    const r = await WonPetsAlert.delete('Delete category?', c.products ? `"${c.name}" still has ${c.products} product(s). Move them first if the delete is refused.` : `"${c.name}" will be removed.`, { confirmText: 'Yes, delete' });
    if (!r.isConfirmed) return;
    try { const res = await smService.deleteCategory(c.id); toast.success(res.message || 'Category deleted'); q.reloadQuiet(); }
    catch (e) { toast.error(errorMessage(e, 'Failed to delete category')); }
  };

  if (q.loading && !q.data) return <WishlistSkeleton />;
  if (q.error && !q.data) return <LoadError message={q.error} onRetry={q.reload} />;

  const totalProducts = mains.reduce((s, c) => s + c.products, 0);
  const popular = [...mains].sort((a, b) => b.products - a.products)[0];
  const stats: { label: string; value: string | number; icon: Icon; tone: DTone }[] = [
    { label: 'Categories', value: all.length, icon: 'grid', tone: 'purple' },
    { label: 'Products', value: totalProducts, icon: 'cube', tone: 'orange' },
    { label: 'Pet categories', value: all.filter((c) => c.type === 'pet').length, icon: 'paw', tone: 'amber' },
    { label: 'Most popular', value: popular?.products ? popular.name : '—', icon: 'star', tone: 'green' },
  ];
  const lockType = !!editing && (!!editing.parent || editing.subcategoryCount > 0 || subsOf(editing.id).length > 0);
  const parentOptions = [{ value: '', label: 'None (main pet category)' }, ...petMains.filter((c) => c.id !== editing?.id).map((c) => ({ value: c.id, label: `Subcategory of ${c.name}` }))];

  return (
    <View className="flex-1 bg-cream">
      <FlatList
        data={list} keyExtractor={(c) => c.id} contentContainerClassName="p-4 gap-3 pb-28"
        refreshControl={<RefreshControl refreshing={q.refreshing} onRefresh={q.reload} tintColor={colors.primary} />}
        ListHeaderComponent={
          <View className="gap-3.5 mb-1">
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2.5 pr-2">
              {stats.map((s) => (
                <View key={s.label} className="w-[116px] bg-white rounded-2xl border border-orange-100 p-3">
                  <View className={cn('w-9 h-9 rounded-xl items-center justify-center mb-1.5', TONES[s.tone].soft)}><Ionicons name={s.icon} size={17} color={TONES[s.tone].fg} /></View>
                  <Text className="text-[18px] font-black text-slate-800" numberOfLines={1} adjustsFontSizeToFit>{s.value}</Text>
                  <Text className="text-[11px] text-slate-500">{s.label}</Text>
                </View>
              ))}
            </ScrollView>
            <SearchBar value={search} onChangeText={setSearch} placeholder="Search categories…" />
          </View>
        }
        ListEmptyComponent={<Empty emoji="🗂️" title={all.length ? 'No matching categories' : 'No categories yet'} body={all.length ? 'Try another name.' : 'Create categories to organise your products and pets.'} />}
        renderItem={({ item: c }) => {
          const [icon, tone] = iconFor(c.name);
          const subs = !c.parent && c.type === 'pet' ? subsOf(c.id) : [];
          return (
            <Pressable onPress={() => navigation.navigate('SMProducts', { category: c.id, categoryName: c.name })} accessibilityRole="button" accessibilityLabel={c.name}
              className="bg-white rounded-3xl border border-orange-100 p-3.5 active:bg-orange-50/40">
              <View className="flex-row items-center gap-3">
                <View className={cn('w-12 h-12 rounded-2xl items-center justify-center', TONES[tone].soft)}><Ionicons name={icon} size={22} color={TONES[tone].fg} /></View>
                <View className="flex-1">
                  <Text className="text-[15px] font-extrabold text-slate-800" numberOfLines={1}>{c.name}</Text>
                  <View className="flex-row items-center gap-1.5 mt-1">
                    <Badge label={c.type === 'pet' ? 'Pet' : 'Product'} tone={c.type === 'pet' ? 'amber' : 'blue'} />
                    <Text className="text-[11.5px] text-slate-500">{c.products} product{c.products === 1 ? '' : 's'}</Text>
                  </View>
                </View>
                <RowAction icon="create-outline" tone="blue" label={`Edit ${c.name}`} onPress={() => startEdit(c)} />
                <RowAction icon="trash-outline" tone="red" label={`Delete ${c.name}`} onPress={() => remove(c)} />
              </View>
              {!!c.description && <Text className="text-[12.5px] text-slate-500 mt-2" numberOfLines={2}>{c.description}</Text>}
              {!!c.parent && <Text className="text-[11.5px] text-orange-600 font-semibold mt-2">Subcategory of {parentName(c)}</Text>}
              {!c.parent && c.type === 'pet' && (
                <View className="flex-row flex-wrap gap-1.5 mt-2.5">
                  {subs.map((s) => (
                    <Pressable key={s.id} onPress={() => navigation.navigate('SMProducts', { category: s.id, categoryName: s.name })} onLongPress={() => startEdit(s)}
                      className="px-2.5 py-1 rounded-full bg-orange-50 border border-orange-200 active:opacity-70">
                      <Text className="text-[11.5px] font-semibold text-orange-700">{s.name} · {s.products}</Text>
                    </Pressable>
                  ))}
                  <Pressable onPress={() => startAdd(c.id)} className="flex-row items-center gap-1 px-2.5 py-1 rounded-full border border-dashed border-orange-300 active:opacity-70">
                    <Ionicons name="add" size={13} color="#EA580C" /><Text className="text-[11.5px] font-bold text-orange-600">Subcategory</Text>
                  </Pressable>
                </View>
              )}
            </Pressable>
          );
        }}
      />
      <Fab label="Add Category" onPress={() => startAdd()} />

      <BottomSheet visible={open} onClose={() => setOpen(false)} title={editing ? 'Edit Category' : form.parent ? 'New Subcategory' : 'New Category'}
        subtitle={editing ? editing.name : 'Organise products and pets'}
        footer={<Button disabled={saving} title={saving ? 'Saving…' : editing ? 'Save Changes' : 'Create Category'} onPress={save} />}>
        <Field label="Category name" value={form.name} onChangeText={(name) => setForm((x) => ({ ...x, name }))} placeholder="e.g. Dog Food" />
        <ChoiceRow label="Type" value={form.type} disabled={lockType}
          onChange={(type) => setForm((x) => ({ ...x, type, parent: type === 'pet' ? x.parent : '' }))}
          options={[{ key: 'product', label: 'Product', icon: 'cube-outline' }, { key: 'pet', label: 'Pet', icon: 'paw-outline' }]} />
        {lockType && <Text className="text-[11.5px] text-muted -mt-2">The type can't change while this category has subcategories or belongs to one.</Text>}
        {form.type === 'pet' && (
          <View>
            <FieldLabel>Parent category</FieldLabel>
            <CustomDropdown value={form.parent} onChange={(parent) => setForm((x) => ({ ...x, parent }))} options={parentOptions} searchable={false}
              disabled={!!editing && subsOf(editing.id).length > 0} placeholder="None (main pet category)" title="Parent category" />
            <Text className="text-[11.5px] text-muted mt-1">Only pet categories can have subcategories (e.g. Pets › Dogs).</Text>
          </View>
        )}
        <Field label="Description" value={form.description} onChangeText={(description) => setForm((x) => ({ ...x, description }))} placeholder="Short description (optional)"
          multiline numberOfLines={3} style={{ minHeight: 80, textAlignVertical: 'top' }} />
      </BottomSheet>
    </View>
  );
}

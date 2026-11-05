import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Image, Keyboard, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { colors } from '../../theme';
import { Button, Empty, T } from '../../components/ui';
import ImageResultCard from '../../components/search/ImageResultCard';
import { toast } from '../../components/WonPetsAlert';
import { ClassifyResult, sharedService } from '../../services/shared.service';
import { SearchGroup, SearchItem, searchService } from '../../services/search.service';
import { errorMessage } from '../../services/api';
import { SearchTarget, searchPages } from '../../config/searchPages';
import { resolveSearchTarget } from '../../utils/searchTarget';

const MIN_CHARS = 2;
const DEBOUNCE_MS = 300;

/** One tappable row in the results list. */
type Row = { key: string; title: string; subtitle?: string; image?: string; badge?: string; icon?: keyof typeof Ionicons.glyphMap; go: SearchTarget | null; raw?: string };
type Section = { label: string; rows: Row[] };

export default function SearchScreen({ navigation, route }: any) {
  const [q, setQ] = useState<string>(route.params?.q ?? '');
  const trimmed = q.trim();
  const [groups, setGroups] = useState<SearchGroup[]>([]);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  // search by image (camera icon in the search bar)
  const [camera, setCamera] = useState<boolean>(!!route.params?.camera);
  const [photo, setPhoto] = useState<string | null>(null);
  const [result, setResult] = useState<ClassifyResult | null>(null);
  const [scanning, setScanning] = useState(false);
  const input = useRef<TextInput>(null);

  // header can send a new query / camera request while this screen is already open
  useEffect(() => { if (route.params?.q != null) setQ(route.params.q); }, [route.params?.q]);
  useEffect(() => { if (route.params?.camera) setCamera(true); }, [route.params?.camera]);

  // Debounced, cancellable server search - same as the web header search
  useEffect(() => {
    if (trimmed.length < MIN_CHARS) { setGroups([]); setBusy(false); setFailed(false); return; }
    const controller = new AbortController();
    setBusy(true); setFailed(false);
    const t = setTimeout(async () => {
      try {
        const g = await searchService.global(trimmed, controller.signal);
        if (!controller.signal.aborted) { setGroups(g); setFailed(false); }
      } catch (e: any) {
        if (e?.code === 'ERR_CANCELED' || e?.name === 'CanceledError' || controller.signal.aborted) return;
        setGroups([]); setFailed(true);
      } finally {
        if (!controller.signal.aborted) setBusy(false);
      }
    }, DEBOUNCE_MS);
    return () => { clearTimeout(t); controller.abort(); };
  }, [trimmed]);

  // "Pages" (instant, local) first, then whatever the server found
  const sections = useMemo<Section[]>(() => {
    if (trimmed.length < MIN_CHARS) return [];
    const out: Section[] = [];
    const pages = searchPages(trimmed);
    if (pages.length) out.push({ label: 'Pages', rows: pages.map((p) => ({ key: `page-${p.title}`, title: p.title, icon: p.icon, go: p.go })) });
    groups.forEach((g, gi) => {
      if (!g.items?.length) return;
      out.push({
        label: g.label,
        rows: g.items.map((it: SearchItem, i) => ({
          key: `${gi}-${it.id ?? it.path}-${i}`, title: it.title, subtitle: it.subtitle, image: it.image, badge: it.badge,
          go: resolveSearchTarget(it.path), raw: it.path,
        })),
      });
    });
    return out;
  }, [trimmed, groups]);
  const flat = sections.flatMap((s) => s.rows);
  const nothingFound = trimmed.length >= MIN_CHARS && !busy && !failed && flat.length === 0;

  const open = (row: Row) => {
    if (!row.go) {
      if (__DEV__) console.log('[search] no mobile screen for web path:', row.raw);
      return toast.error("This result can't be opened in the app yet.");
    }
    Keyboard.dismiss();
    navigation.navigate(row.go.name, row.go.params);
  };
  // keyboard "search" key = open the top result, like Enter on the web
  const submit = () => { if (flat[0]) open(flat[0]); };

  const identify = async (from: 'camera' | 'gallery') => {
    try {
      const perm = from === 'camera' ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) return toast.error(from === 'camera' ? 'Camera permission is needed to take a photo.' : 'Photo access is needed to pick an image.');
      const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7, allowsEditing: false };
      const r = from === 'camera' ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
      if (r.canceled) return;
      const uri = r.assets[0].uri;
      setPhoto(uri); setResult(null); setScanning(true);
      try { setResult(await sharedService.classify(uri)); }
      catch (e) { toast.error(errorMessage(e, 'Could not identify the image. Please try a clearer photo.')); }
      finally { setScanning(false); }
    } catch (e) { toast.error(errorMessage(e)); }
  };
  const reset = () => { setPhoto(null); setResult(null); setScanning(false); };

  return (
    <View className="flex-1 bg-cream">
      <View className="m-4 mb-2 flex-row items-center gap-2 bg-white border border-line rounded-2xl px-3.5">
        <Ionicons name="search-outline" size={18} color={colors.muted} />
        <TextInput
          ref={input} autoFocus={!camera} value={q} onChangeText={setQ} onSubmitEditing={submit}
          placeholder="Search anything..." placeholderTextColor="#B8AEA5" className="flex-1 py-3 text-ink" returnKeyType="search"
          autoCorrect={false} autoCapitalize="none"
        />
        {busy && <ActivityIndicator size="small" color={colors.primary} />}
        {!!q && <Pressable hitSlop={8} onPress={() => { setQ(''); input.current?.focus(); }}><Ionicons name="close-circle" size={18} color="#C9BFB5" /></Pressable>}
        <Pressable hitSlop={8} accessibilityLabel="Search by image" onPress={() => setCamera((v) => !v)}><Ionicons name="camera-outline" size={21} color={camera ? colors.primaryDark : colors.primary} /></Pressable>
      </View>

      <ScrollView contentContainerClassName="px-4 pb-10 gap-2.5" keyboardShouldPersistTaps="handled">
        {camera && (
          <View className="gap-3 bg-white rounded-3xl border border-line p-4 mb-1">
            <View className="flex-row items-center justify-between">
              <View className="flex-1"><Text className={T.h3}>Search by image</Text><Text className={T.small}>Identify a breed, a product or a visible health issue.</Text></View>
              <Pressable hitSlop={8} onPress={() => { setCamera(false); reset(); }}><Ionicons name="close" size={20} color={colors.muted} /></Pressable>
            </View>
            {!photo && (
              <View className="flex-row gap-3">
                <Pressable onPress={() => identify('camera')} className="flex-1 items-center gap-1.5 rounded-2xl border-2 border-primary bg-primary-soft py-5"><Ionicons name="camera" size={28} color={colors.primary} /><Text className="font-bold text-ink">Take a photo</Text></Pressable>
                <Pressable onPress={() => identify('gallery')} className="flex-1 items-center gap-1.5 rounded-2xl border-2 border-dashed border-orange-300 py-5"><Ionicons name="images-outline" size={28} color={colors.primary} /><Text className="font-bold text-ink">From gallery</Text></Pressable>
              </View>
            )}
            {scanning && <View className="items-center py-5 gap-2"><ActivityIndicator color={colors.primary} /><Text className={T.small}>Identifying…</Text></View>}
            {!!photo && !scanning && result && <ImageResultCard uri={photo} result={result} />}
            {!!photo && !scanning && !result && <Text className="text-center text-sm text-muted">We couldn't identify that photo.</Text>}
            {!!photo && !scanning && <Button variant="outline" title="Try another photo" icon={<Ionicons name="refresh" size={17} color={colors.primary} />} onPress={reset} />}
          </View>
        )}

        {trimmed.length < MIN_CHARS && !camera && <Empty emoji="🔎" title="Search WON PET PRO" body="Find your pets, products, orders, appointments or any page. Tap the camera to search by photo." />}

        {sections.map((s) => (
          <View key={s.label} className="gap-2">
            <Text className="text-[11px] font-extrabold text-muted uppercase tracking-wide mt-1">{s.label}</Text>
            {s.rows.map((r) => (
              <Pressable key={r.key} onPress={() => open(r)} className="flex-row items-center gap-3 bg-white rounded-2xl p-3 border border-line active:bg-primary-soft">
                {r.image ? (
                  <Image source={{ uri: r.image }} style={{ width: 44, height: 44, borderRadius: 12 }} />
                ) : (
                  <View className="w-11 h-11 rounded-xl bg-primary-soft items-center justify-center"><Ionicons name={r.icon ?? 'search-outline'} size={19} color={colors.primary} /></View>
                )}
                <View className="flex-1">
                  <Text className={T.h3} numberOfLines={1}>{r.title}</Text>
                  {!!r.subtitle && <Text className={T.small} numberOfLines={1}>{r.subtitle}</Text>}
                </View>
                {!!r.badge && <View className="bg-primary-soft rounded-full px-2.5 py-0.5"><Text className="text-[10px] font-bold text-primary-dark">{r.badge}</Text></View>}
                <Ionicons name="chevron-forward" size={16} color={colors.muted} />
              </Pressable>
            ))}
          </View>
        ))}

        {busy && flat.length === 0 && trimmed.length >= MIN_CHARS && <Text className="text-sm text-muted px-1 py-3">Searching…</Text>}
        {failed && <Text className="text-sm text-red px-1 py-3">Couldn't search right now. Please try again.</Text>}
        {nothingFound && <Empty emoji="🤷" title="No results" body={`Nothing matched “${trimmed}”.`} />}
      </ScrollView>
    </View>
  );
}
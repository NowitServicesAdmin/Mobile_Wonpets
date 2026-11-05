import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';
import { cn } from '../ui';
import { WonPetsAlert } from '../WonPetsAlert';
import { PlaceDetails, Prediction, locationService } from '../../services/location.service';
import { getCurrentCoords } from '../../utils/location';

/**
 * Location search - the mobile twin of the web LocationPicker:
 * type 3+ letters to search places, or tap the crosshair to use the current position.
 * The address parts (street, city, state, ...) are filled from the chosen place, not typed by hand.
 */
export default function LocationPicker({ value, onChange, label = 'Location', placeholder = 'Search location...', disabled = false }: {
  value?: string; onChange: (place: PlaceDetails | null) => void; label?: string; placeholder?: string; disabled?: boolean;
}) {
  const [query, setQuery] = useState(value ?? '');
  const [results, setResults] = useState<Prediction[]>([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seq = useRef(0);

  useEffect(() => { setQuery(value ?? ''); }, [value]);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const onType = (text: string) => {
    if (disabled) return;
    setQuery(text);
    if (timer.current) clearTimeout(timer.current);
    if (text.trim().length < 3) { setResults([]); setOpen(false); return; }
    timer.current = setTimeout(async () => {
      const mine = ++seq.current;
      setSearching(true);
      try {
        const places = await locationService.search(text.trim());
        if (mine !== seq.current) return;
        setResults(places); setOpen(true);
      } catch { if (mine === seq.current) { setResults([]); setOpen(false); } }
      finally { if (mine === seq.current) setSearching(false); }
    }, 400);
  };

  const pick = async (p: Prediction) => {
    setSearching(true);
    try {
      const place = await locationService.details(p.place_id);
      if (!place) return;
      setQuery(place.address); setResults([]); setOpen(false);
      onChange({ ...place, placeId: place.placeId || p.place_id });
    } catch { WonPetsAlert.error('Location unavailable', 'Could not load that place. Please try another.'); }
    finally { setSearching(false); }
  };

  const useCurrent = async () => {
    setLocating(true);
    try {
      const c = await getCurrentCoords();
      if (!c) { WonPetsAlert.error('Location unavailable', 'Allow location access to use your current position.'); return; }
      const place = await locationService.reverse(c.lat, c.lng);
      if (!place) return;
      setQuery(place.address); setResults([]); setOpen(false);
      onChange({ ...place, placeId: '' });
    } catch { WonPetsAlert.error('Location unavailable', 'Unable to fetch your current location.'); }
    finally { setLocating(false); }
  };

  const clear = () => { setQuery(''); setResults([]); setOpen(false); onChange(null); };

  return (
    <View>
      <Text className="font-bold text-ink mb-1.5">{label}</Text>
      <View className={cn('flex-row items-center border-[1.5px] rounded-2xl px-3.5', disabled ? 'bg-primary-soft opacity-70 border-line' : open ? 'bg-white border-primary' : 'bg-white border-line')}>
        <Ionicons name="search-outline" size={18} color={colors.muted} />
        <TextInput
          value={query} onChangeText={onType} editable={!disabled} placeholder={placeholder} placeholderTextColor={colors.muted}
          onFocus={() => !disabled && results.length > 0 && setOpen(true)} className="flex-1 px-2.5 py-3.5 text-[15px] text-ink"
        />
        {(searching || locating) && <ActivityIndicator size="small" color={colors.primary} />}
        {!disabled && !searching && !locating && !!query && <Pressable hitSlop={8} onPress={clear} className="mr-2.5"><Ionicons name="close-circle" size={18} color="#C9BFB5" /></Pressable>}
        {!disabled && <Pressable hitSlop={8} accessibilityLabel="Use current location" onPress={useCurrent}><Ionicons name="locate" size={22} color={colors.primary} /></Pressable>}
        {disabled && <Ionicons name="lock-closed" size={16} color={colors.muted} />}
      </View>

      {open && !disabled && (
        <View className="mt-2 rounded-2xl border border-line bg-white overflow-hidden">
          <Pressable onPress={useCurrent} className="flex-row items-center gap-3 px-3.5 py-3 border-b border-orange-50 active:bg-cream">
            <View className="w-9 h-9 rounded-full bg-primary-soft items-center justify-center"><Ionicons name="locate" size={18} color={colors.primary} /></View>
            <View className="flex-1"><Text className="font-bold text-ink">Use current location</Text><Text className="text-xs text-muted">Detect automatically</Text></View>
          </Pressable>
          {results.map((r: any) => (
            <Pressable key={r.place_id} onPress={() => pick(r)} className="flex-row items-start gap-3 px-3.5 py-3 border-b border-orange-50 active:bg-cream">
              <View className="w-9 h-9 rounded-full bg-primary-soft items-center justify-center"><Ionicons name="location" size={17} color={colors.primary} /></View>
              <View className="flex-1">
                <Text className="font-bold text-ink" numberOfLines={1}>{r.structured_formatting?.main_text || r.description}</Text>
                <Text className="text-xs text-muted mt-0.5" numberOfLines={2}>{r.description}</Text>
              </View>
            </Pressable>
          ))}
          {!searching && results.length === 0 && (
            <View className="items-center py-6"><Ionicons name="location-outline" size={28} color="#D8C7B5" /><Text className="font-semibold text-muted mt-1">No locations found</Text><Text className="text-xs text-muted">Try searching another place.</Text></View>
          )}
        </View>
      )}
    </View>
  );
}

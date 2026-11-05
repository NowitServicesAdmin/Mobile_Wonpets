import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, LayoutAnimation, Platform, Pressable, Switch, Text, UIManager, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';
import { T, cn } from '../ui';
import { toast } from '../WonPetsAlert';
import { NOTIFICATION_GROUPS, NotificationPrefs, PrefGroup } from '../../data/settings';
import { useSettings } from '../../context/SettingsContext';
import { errorMessage } from '../../services/api';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) UIManager.setLayoutAnimationEnabledExperimental(true);

type SaveState = 'idle' | 'saving' | 'saved';
type IconName = keyof typeof Ionicons.glyphMap;

// one coloured tile per group so they are easy to tell apart
const GROUP_UI: Record<PrefGroup, { icon: IconName; box: string; fg: string }> = {
  email: { icon: 'mail-outline', box: 'bg-blue-soft', fg: colors.blue },
  notifications: { icon: 'notifications-outline', box: 'bg-yellow-soft', fg: colors.yellow },
  alerts: { icon: 'alarm-outline', box: 'bg-primary-soft', fg: colors.primary },
};
const TRACK = { false: '#E5DDD3', true: colors.primary };

/** Email / Notifications / Alerts as three collapsible cards: the master switch sits on the header, tap the header to open the list.
 *  There is no Save button: every change is saved automatically (a short pause after the last tap, so quick taps become one request). */
export default function NotificationsSection() {
  const { prefs, savePrefs } = useSettings();
  const [p, setP] = useState<NotificationPrefs>(prefs);
  const [state, setState] = useState<SaveState>('idle');
  const [openG, setOpenG] = useState<Record<PrefGroup, boolean>>({ email: false, notifications: false, alerts: false });
  const latest = useRef(p);             // newest local copy (what we will send)
  const lastSaved = useRef(prefs);      // last copy the server confirmed (used to roll back on failure)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlight = useRef(false);
  const dirty = useRef(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // take the server copy when it arrives - but never overwrite taps that are still waiting to be saved
  useEffect(() => {
    lastSaved.current = prefs;
    if (!dirty.current && !inFlight.current) { setP(prefs); latest.current = prefs; }
  }, [prefs]);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); if (hideTimer.current) clearTimeout(hideTimer.current); }, []);

  const flush = async () => {
    if (inFlight.current) return; // the running save re-runs itself below if more changes came in
    inFlight.current = true; dirty.current = false;
    setState('saving');
    const sending = latest.current;
    try {
      await savePrefs(sending);
      lastSaved.current = sending;
      if (dirty.current) { inFlight.current = false; return flush(); } // user tapped again while saving
      setState('saved');
      if (hideTimer.current) clearTimeout(hideTimer.current);
      hideTimer.current = setTimeout(() => setState('idle'), 1600);
    } catch (e) {
      dirty.current = false;
      setP(lastSaved.current); latest.current = lastSaved.current; // roll the switches back
      setState('idle');
      toast.error(`Couldn't save: ${errorMessage(e)}`);
    } finally { inFlight.current = false; }
  };

  const toggle = (g: PrefGroup, k: string) => {
    const next = { ...latest.current, [g]: { ...latest.current[g], [k]: !latest.current[g][k] } };
    latest.current = next; setP(next); dirty.current = true;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(flush, 500);
  };
  const expand = (g: PrefGroup) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpenG((o) => ({ ...o, [g]: !o[g] }));
  };

  return (
    <View className="gap-3">
      <View className="flex-row items-center justify-between gap-3 px-1">
        <View className="flex-row items-center gap-1.5 flex-1"><Ionicons name="sync-outline" size={14} color={colors.muted} /><Text className={T.small}>Changes are saved automatically</Text></View>
        {state === 'saving' && <View className="flex-row items-center gap-1.5"><ActivityIndicator size="small" color={colors.primary} /><Text className={T.small}>Saving…</Text></View>}
        {state === 'saved' && <View className="flex-row items-center gap-1"><Ionicons name="checkmark-circle" size={16} color={colors.green} /><Text className="text-xs font-semibold text-green">Saved</Text></View>}
      </View>

      {(Object.keys(NOTIFICATION_GROUPS) as PrefGroup[]).map((g) => {
        const grp = NOTIFICATION_GROUPS[g]; const ui = GROUP_UI[g];
        const on = p[g].enabled; const isOpen = openG[g];
        const keys = Object.keys(grp.categories);
        const active = keys.filter((k) => p[g][k]).length;
        return (
          <View key={g} className="bg-white rounded-3xl border border-orange-100 overflow-hidden">
            {/* header: tap to open / close, switch turns the whole group on or off */}
            <Pressable onPress={() => expand(g)} accessibilityRole="button" accessibilityLabel={`${grp.label} settings`} accessibilityState={{ expanded: isOpen }} className="flex-row items-center gap-3 px-3.5 py-3.5 active:bg-cream">
              <View className={cn('w-11 h-11 rounded-2xl items-center justify-center', ui.box)}><Ionicons name={ui.icon} size={21} color={ui.fg} /></View>
              <View className="flex-1">
                <Text maxFontSizeMultiplier={1.1} numberOfLines={1} className="text-[16px] font-extrabold text-ink">{grp.label}</Text>
                <Text maxFontSizeMultiplier={1.1} numberOfLines={1} className="text-[12px] text-muted">{on ? `${active} of ${keys.length} on` : 'Off'}</Text>
              </View>
              <Switch value={on} onValueChange={() => toggle(g, 'enabled')} trackColor={TRACK} thumbColor="#fff" ios_backgroundColor="#E5DDD3" />
              <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={20} color={colors.muted} />
            </Pressable>

            {isOpen && (
              <View className="border-t border-line">
                <Text className="px-3.5 pt-3 pb-1 text-[12px] text-muted">{grp.description}</Text>
                {Object.entries(grp.categories).map(([k, c], i) => (
                  <View key={k} className={cn('flex-row items-center gap-3 px-3.5 py-3', i > 0 && 'border-t border-line', !on && 'opacity-40')}>
                    <View className="flex-1"><Text className="text-[14px] font-bold text-ink">{c.title}</Text><Text className={T.small}>{c.description}</Text></View>
                    <Switch disabled={!on} value={on && p[g][k]} onValueChange={() => toggle(g, k)} trackColor={TRACK} thumbColor="#fff" ios_backgroundColor="#E5DDD3" />
                  </View>
                ))}
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}
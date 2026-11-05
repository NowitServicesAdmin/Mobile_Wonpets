import React, { useEffect, useRef, useState } from 'react';
import { Animated, Image, Modal, Pressable, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type AlertType = 'success' | 'error' | 'warning' | 'info' | 'delete' | 'question' | 'logout';
type Grad = [string, string];

const TYPES: Record<AlertType, { icon: keyof typeof Ionicons.glyphMap; grad: Grad }> = {
  success: { icon: 'checkmark', grad: ['#22C55E', '#16A34A'] },
  error: { icon: 'close', grad: ['#EF4444', '#DC2626'] },
  warning: { icon: 'warning', grad: ['#F59E0B', '#D97706'] },
  info: { icon: 'information', grad: ['#3B82F6', '#2563EB'] },
  delete: { icon: 'trash', grad: ['#EF4444', '#DC2626'] },
  question: { icon: 'help', grad: ['#6366F1', '#4F46E5'] },
  logout: { icon: 'log-out', grad: ['#FF7A00', '#FFA726'] },
};
const ORANGE: Grad = ['#FF7A00', '#FFA726'];
const RED: Grad = ['#EF4444', '#DC2626'];

type Options = { showCancel?: boolean; buttonText?: string; confirmText?: string; cancelText?: string; confirmColors?: Grad };
type Cfg = Options & { title: string; text?: string; type: AlertType };
type Result = { isConfirmed: boolean };

let showAlert: ((c: Cfg) => Promise<Result>) | null = null;
let showToast: ((message: string, type: 'success' | 'error' | 'info') => void) | null = null;

const open = (type: AlertType, title: string, text = '', o: Options = {}): Promise<Result> =>
  showAlert ? showAlert({ type, title, text, ...o }) : Promise.resolve({ isConfirmed: false });

/** Same API as the web WonPetsAlert. `delete`/`confirm`/`logout` resolve with { isConfirmed }. */
export const WonPetsAlert = {
  success: (t: string, x?: string, o?: Options) => open('success', t, x, o),
  error: (t: string, x?: string, o?: Options) => open('error', t, x, o),
  warning: (t: string, x?: string, o?: Options) => open('warning', t, x, o),
  info: (t: string, x?: string, o?: Options) => open('info', t, x, o),
  delete: (t: string, x?: string, o?: Options) => open('delete', t, x, { showCancel: true, confirmText: 'Delete', confirmColors: RED, ...o }),
  confirm: (t: string, x?: string, o?: Options) => open('question', t, x, { showCancel: true, confirmText: 'Continue', ...o }),
  logout: (t: string, x?: string, o?: Options) => open('logout', t, x, { showCancel: true, confirmText: 'Logout', cancelText: 'Stay Logged In', ...o }),
};

/** Replacement for react-hot-toast. */
export const toast = {
  success: (m: string) => showToast?.(m, 'success'),
  error: (m: string) => showToast?.(m, 'error'),
  info: (m: string) => showToast?.(m, 'info'),
};

/** Mount once in App.tsx, below the navigator. */
export function AlertHost() {
  const insets = useSafeAreaInsets();
  const [alert, setAlert] = useState<{ cfg: Cfg; resolve: (r: Result) => void } | null>(null);
  const [note, setNote] = useState<{ id: number; message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const fade = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    showAlert = (cfg) => new Promise((resolve) => setAlert({ cfg, resolve }));
    showToast = (message, type) => {
      if (timer.current) clearTimeout(timer.current);
      setNote({ id: Date.now(), message, type });
      fade.setValue(0);
      Animated.timing(fade, { toValue: 1, duration: 180, useNativeDriver: true }).start();
      timer.current = setTimeout(() => {
        Animated.timing(fade, { toValue: 0, duration: 220, useNativeDriver: true }).start(() => setNote(null));
      }, 2400);
    };
    return () => { showAlert = null; showToast = null; };
  }, [fade]);

  const finish = (isConfirmed: boolean) => { alert?.resolve({ isConfirmed }); setAlert(null); };
  const cfg = alert?.cfg;
  const t = cfg ? TYPES[cfg.type] : TYPES.success;
  const dot = note?.type === 'success' ? '#16A34A' : note?.type === 'error' ? '#EF4444' : '#3B82F6';

  return (
    <>
      <Modal visible={!!alert} transparent animationType="fade" onRequestClose={() => finish(false)}>
        <View className="flex-1 items-center justify-center px-6" style={{ backgroundColor: 'rgba(15,23,42,0.55)' }}>
          {!!cfg && (
            <View className="w-full max-w-[380px] bg-white rounded-[28px] overflow-hidden">
              <LinearGradient colors={['#FFF1E3', '#FFD9B0']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ height: 96, alignItems: 'center', justifyContent: 'center' }}>
                <Pressable onPress={() => finish(false)} hitSlop={10} className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/80 items-center justify-center">
                  <Ionicons name="close" size={16} color="#475569" />
                </Pressable>
                <Image source={require('../assets/logo.png')} style={{ width: 120, height: 44 }} resizeMode="contain" />
              </LinearGradient>
              <View className="items-center px-6 pb-6">
                <LinearGradient colors={t.grad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginTop: -32, borderWidth: 4, borderColor: '#fff' }}>
                  <Ionicons name={t.icon} size={28} color="#fff" />
                </LinearGradient>
                <Text className="text-xl font-black text-ink mt-3 text-center">{cfg.title}</Text>
                {!!cfg.text && <Text className="text-sm text-muted text-center leading-5 mt-1.5">{cfg.text}</Text>}
                <View className="flex-row gap-3 mt-5 self-stretch">
                  {cfg.showCancel && (
                    <Pressable onPress={() => finish(false)} className="flex-1 py-3.5 rounded-2xl bg-slate-100 items-center active:opacity-80">
                      <Text className="font-bold text-slate-600">{cfg.cancelText ?? 'Cancel'}</Text>
                    </Pressable>
                  )}
                  <Pressable onPress={() => finish(true)} className="flex-1 active:opacity-80">
                    <LinearGradient colors={cfg.confirmColors ?? ORANGE} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ paddingVertical: 14, borderRadius: 16, alignItems: 'center' }}>
                      <Text className="font-bold text-white">{cfg.showCancel ? cfg.confirmText ?? 'Continue' : cfg.buttonText ?? 'Continue'}</Text>
                    </LinearGradient>
                  </Pressable>
                </View>
              </View>
            </View>
          )}
        </View>
      </Modal>

      {!!note && (
        <Animated.View pointerEvents="none" style={{ position: 'absolute', top: insets.top + 8, left: 16, right: 16, alignItems: 'center', opacity: fade, transform: [{ translateY: fade.interpolate({ inputRange: [0, 1], outputRange: [-12, 0] }) }] }}>
          <View className="flex-row items-center gap-2 bg-white border border-line rounded-full px-4 py-2.5" style={{ elevation: 6, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: dot }} />
            <Text className="text-sm font-semibold text-ink" numberOfLines={2}>{note.message}</Text>
          </View>
        </Animated.View>
      )}
    </>
  );
}

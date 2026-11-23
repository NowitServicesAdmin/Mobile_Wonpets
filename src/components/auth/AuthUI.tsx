import React from 'react';
import { Text, TextInput, TextInputProps, TouchableOpacity, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { gradients, shadows } from '../../theme';

export const AUTH = {
  ink: '#13213F',
  orange: '#FF6B00',
  border: '#F3DFD0',
  placeholder: '#A8A09A',
  text: '#1F1B16',
};

/** Bold label with a small outline icon, as in the design. */
export function AuthLabel({ icon, children }: { icon: keyof typeof Ionicons.glyphMap; children: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
      <Ionicons name={icon} size={20} color={AUTH.ink} />
      <Text style={{ marginLeft: 12, fontSize: 13.5, fontWeight: '800', color: AUTH.ink }}>{children}</Text>
    </View>
  );
}

/** White rounded input box (shared by every auth field). */
export const authBox = {
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  backgroundColor: '#FFFFFF',
  borderWidth: 1,
  borderColor: AUTH.border,
  borderRadius: 16,
  paddingHorizontal: 14,
  height: 46,
  shadowColor: '#C2410C',
  shadowOpacity: 0.05,
  shadowRadius: 6,
  shadowOffset: { width: 0, height: 2 },
  elevation: 1,
};

export function AuthField({ label, icon = 'person-outline', ...rest }: TextInputProps & { label: string; icon?: keyof typeof Ionicons.glyphMap }) {
  return (
    <View>
      <AuthLabel icon={icon}>{label}</AuthLabel>
      <View style={authBox}>
        <TextInput
          placeholderTextColor={AUTH.placeholder}
          style={{ flex: 1, fontSize: 14, color: AUTH.text, paddingVertical: 0 }}
          {...rest}
        />
      </View>
    </View>
  );
}

/** Orange gradient pill button with a trailing arrow. */
export function GradientButton({ title, onPress, disabled, arrow = true }: { title: string; onPress?: () => void; disabled?: boolean; arrow?: boolean }) {
  return (
    <TouchableOpacity onPress={onPress} disabled={disabled} activeOpacity={0.85} style={{ opacity: disabled ? 0.5 : 1 }}>
      <LinearGradient
        colors={gradients.primary}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={{
          height: 52,
          borderRadius: 26,
          alignItems: 'center',
          justifyContent: 'center',
          ...shadows.button,
        }}
      >
        <Text style={{ color: '#fff', fontSize: 17, fontWeight: '600' }}>{title}</Text>
        {arrow && <Ionicons name="arrow-forward" size={22} color="#fff" style={{ position: 'absolute', right: 20 }} />}
      </LinearGradient>
    </TouchableOpacity>
  );
}

/** Four-colour Google "G". */
function GoogleG({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Path fill="#4285F4" d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z" />
      <Path fill="#34A853" d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z" />
      <Path fill="#FBBC05" d="M11.69 28.18C11.25 26.86 11 25.45 11 24s.25-2.86.69-4.18v-5.7H4.34C2.85 17.09 2 20.45 2 24c0 3.55.85 6.91 2.34 9.88l7.35-5.7z" />
      <Path fill="#EA4335" d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z" />
    </Svg>
  );
}

/** White "Continue with Google" pill. */
export function GoogleButton({ onPress, disabled }: { onPress?: () => void; disabled?: boolean }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.85}
      style={{
        height: 48,
        borderRadius: 24,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: AUTH.border,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <GoogleG size={20} />
      <Text style={{ marginLeft: 10, fontSize: 15, fontWeight: '700', color: AUTH.ink }}>Continue with Google</Text>
    </TouchableOpacity>
  );
}
import React from 'react';
import { Image, Platform, Text, TextInput, TextInputProps, TouchableOpacity, View } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
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

export function AuthField({
  label,
  icon = 'person-outline',
  ...rest
}: TextInputProps & { label: string; icon?: keyof typeof Ionicons.glyphMap }) {
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
export function GradientButton({
  title,
  onPress,
  disabled,
  arrow = true,
}: {
  title: string;
  onPress?: () => void;
  disabled?: boolean;
  arrow?: boolean;
}) {
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

/**
 * Four-colour Google "G".
 * Uses a PNG instead of react-native-svg paths, which render as a filled
 * square on some iOS builds. Put a ~96x96 PNG at assets/google-g.png
 * (adjust the require path if your assets folder is elsewhere).
 */
export function GoogleG({ size = 20 }: { size?: number }) {
  return (
    <Image
      source={require('../../assets/google-g.png')}
      style={{ width: size, height: size }}
      resizeMode="contain"
    />
  );
}

/** White "Continue with Google" pill. */
export function GoogleButton({
  onPress,
  disabled,
  label = 'Continue with Google',
}: {
  onPress?: () => void;
  disabled?: boolean;
  label?: string;
}) {
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
      <Text style={{ marginLeft: 10, fontSize: 15, fontWeight: '700', color: AUTH.ink }}>{label}</Text>
    </TouchableOpacity>
  );
}

/** Native "Continue with Apple" pill. Renders on iOS only. */
export function AppleButton({ onPress, disabled }: { onPress: () => void; disabled?: boolean }) {
  if (Platform.OS !== 'ios') return null;
  return (
    <View style={{ opacity: disabled ? 0.5 : 1 }} pointerEvents={disabled ? 'none' : 'auto'}>
      <AppleAuthentication.AppleAuthenticationButton
        buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
        buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
        cornerRadius={24}
        style={{ height: 48, width: '100%' }}
        onPress={onPress}
      />
    </View>
  );
}
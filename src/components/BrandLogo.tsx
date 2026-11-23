import React from 'react';
import { Image, Text, View } from 'react-native';

type Variant = 'light' | 'onOrange' | 'dark';
type Size = 'sm' | 'md' | 'lg' | 'xl';

const SIZES: Record<Size, { img: number; name: number; badge: number; tag: number }> = {
  sm: { img: 32, name: 18, badge: 10, tag: 9 },
  md: { img: 40, name: 22, badge: 11, tag: 10 },
  lg: { img: 52, name: 30, badge: 13, tag: 11 },
  xl: { img: 120, name: 38, badge: 16, tag: 13 },
};

const VARIANTS: Record<Variant, { won: string; pet: string; badgeBg: string; badgeText: string; tag: string; dot: string }> = {
  light: { won: '#FF6A00', pet: '#1A1A2E', badgeBg: '#FF6A00', badgeText: '#FFFFFF', tag: '#64748B', dot: '#FB923C' },
  dark: { won: '#FF8A1F', pet: '#FFFFFF', badgeBg: '#FF6A00', badgeText: '#FFFFFF', tag: 'rgba(255,255,255,0.7)', dot: '#FB923C' },
  onOrange: { won: '#FFFFFF', pet: '#FFFFFF', badgeBg: '#FFFFFF', badgeText: '#FF6A00', tag: 'rgba(255,255,255,0.88)', dot: '#FFFFFF' },
};

type WordmarkProps = {
  variant?: Variant;
  size?: Size;
  tagline?: boolean;
  align?: 'left' | 'center';
};

/** Text-only "Won Pet Pro" (no logo image). */
export function BrandWordmark({ variant = 'light', size = 'md', tagline = true, align = 'left' }: WordmarkProps) {
  const s = SIZES[size];
  const v = VARIANTS[variant];
  const center = align === 'center';
  return (
    <View
      accessible
      accessibilityRole="header"
      accessibilityLabel="Won Pet Pro"
      style={{ alignItems: center ? 'center' : 'flex-start' }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
        <Text maxFontSizeMultiplier={1.1} style={{ fontSize: s.name, fontWeight: '600', color: v.won, letterSpacing: 0.2 }}>Won</Text>
        <Text maxFontSizeMultiplier={1.1} style={{ fontSize: s.name, fontWeight: '800', color: v.pet, marginLeft: 6, letterSpacing: 0.2 }}>Pet</Text>
        <View
          style={{
            marginLeft: 6,
            backgroundColor: v.badgeBg,
            borderRadius: 6,
            paddingHorizontal: Math.round(s.badge * 0.5),
            paddingVertical: 2,
          }}
        >
          <Text maxFontSizeMultiplier={1.1} style={{ fontSize: s.badge, fontWeight: '800', color: v.badgeText }}>Pro</Text>
        </View>
      </View>
      {tagline && (
        <Text maxFontSizeMultiplier={1.1} numberOfLines={1} style={{ marginTop: 4, fontSize: s.tag, letterSpacing: 0.6, color: v.tag }}>
          Care <Text style={{ color: v.dot }}>•</Text> Health <Text style={{ color: v.dot }}>•</Text> Happiness
        </Text>
      )}
    </View>
  );
}

type LogoProps = WordmarkProps & {
  /** 'row' = logo beside the name (like the web header), 'stack' = logo above the name (splash / sign-in). */
  layout?: 'row' | 'stack';
  /** Wrap the logo image in a white circle (needed on orange backgrounds). */
  imageBackdrop?: boolean;
};

/** Logo image + "Won Pet Pro" wordmark. */
export default function BrandLogo({ variant = 'light', size = 'md', tagline = true, layout = 'row', imageBackdrop = false }: LogoProps) {
  const s = SIZES[size];
  const stack = layout === 'stack';
  const image = (
    <Image
      source={require('../assets/logo.png')}
      style={{ width: s.img, height: s.img, borderRadius: Math.round(s.img * 0.23) }}
      resizeMode="contain"
    />
  );
  return (
    <View style={{ flexDirection: stack ? 'column' : 'row', alignItems: 'center', gap: stack ? 14 : 10 }}>
      {imageBackdrop ? (
        <View
          style={{
            width: s.img + 12,
            height: s.img + 12,
            borderRadius: (s.img + 12) / 2,
            backgroundColor: '#fff',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {image}
        </View>
      ) : image}
      <BrandWordmark variant={variant} size={size} tagline={tagline} align={stack ? 'center' : 'left'} />
    </View>
  );
}
import React from 'react';
import { View } from 'react-native';
import Svg, { Defs, Ellipse, LinearGradient as SvgGradient, Path, Stop } from 'react-native-svg';

/** Soft orange paw print (used as decoration). */
export function Paw({ size = 40, color = '#F9A25B', opacity = 1, rotate = 0 }: { size?: number; color?: string; opacity?: number; rotate?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" style={{ opacity, transform: [{ rotate: `${rotate}deg` }] }}>
      <Ellipse cx="32" cy="43" rx="15" ry="12" fill={color} />
      <Ellipse cx="13" cy="29" rx="6" ry="8.5" fill={color} transform="rotate(-20 13 29)" />
      <Ellipse cx="25" cy="16" rx="6" ry="8.5" fill={color} />
      <Ellipse cx="39" cy="16" rx="6" ry="8.5" fill={color} />
      <Ellipse cx="51" cy="29" rx="6" ry="8.5" fill={color} transform="rotate(20 51 29)" />
    </Svg>
  );
}

/** Faint paw prints scattered over the screen background. */
export function BackgroundPaws() {
  const items = [
    { top: 150, left: -6, size: 54, rotate: -20 },
    { top: 330, left: 6, size: 46, rotate: 15 },
    { top: 520, right: -4, size: 50, rotate: 25 },
    { bottom: 40, left: 10, size: 40, rotate: -10 },
    { top: 230, right: 6, size: 38, rotate: -25 },
  ] as const;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
      {items.map((p, i) => (
        <View key={i} style={{ position: 'absolute', ...(p as object) }}>
          <Paw size={p.size} color="#F6C9A4" opacity={0.35} rotate={p.rotate} />
        </View>
      ))}
    </View>
  );
}

/**
 * Orange swoosh behind the logo block (drawn in code, so it is crisp on every screen,
 * has no opaque corners and scales to any width).
 */
export function WaveHeader({ width, height }: { width: number; height: number }) {
  return (
    <Svg width={width} height={height} viewBox="0 0 360 100" preserveAspectRatio="none">
      <Defs>
        <SvgGradient id="waveBand" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#FF9A3D" />
          <Stop offset="0.55" stopColor="#FFB874" />
          <Stop offset="1" stopColor="#FFD3A8" />
        </SvgGradient>
        <SvgGradient id="waveFill" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FFE6D1" />
          <Stop offset="1" stopColor="#FFF3E8" stopOpacity="0" />
        </SvgGradient>
      </Defs>
      {/* soft peach body under the band */}
      <Path d="M0 18 C60 -6 120 40 190 48 C250 54 300 20 360 26 L360 100 L0 100 Z" fill="url(#waveFill)" />
      {/* the orange ribbon: thick on the left, thinning out to the right */}
      <Path
        d="M0 14 C58 -8 118 38 188 46 C252 52 306 20 360 28 C306 28 262 62 190 62 C120 62 62 22 0 50 Z"
        fill="url(#waveBand)"
      />
    </Svg>
  );
}

/** Peach hills along the bottom edge (login / sign-up / verify). */
export function BottomHills({ width, height = 96 }: { width: number; height?: number }) {
  return (
    <Svg width={width} height={height} viewBox="0 0 360 96" preserveAspectRatio="none">
      <Defs>
        <SvgGradient id="hillBack" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FFDDBF" stopOpacity="0.55" />
          <Stop offset="1" stopColor="#FFD2AA" stopOpacity="0.9" />
        </SvgGradient>
        <SvgGradient id="hillFront" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#FFC590" />
          <Stop offset="1" stopColor="#FFD9B6" />
        </SvgGradient>
      </Defs>
      <Path d="M0 38 C70 6 130 8 200 30 C260 48 310 40 360 18 L360 96 L0 96 Z" fill="url(#hillBack)" />
      <Path d="M0 70 C60 46 120 52 190 66 C250 78 310 66 360 50 L360 96 L0 96 Z" fill="url(#hillFront)" />
    </Svg>
  );
}

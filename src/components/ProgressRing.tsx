import React from 'react';
import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

// The original zip imported this component but never included it.
export default function ProgressRing({ color, progress = 1, size = 64, stroke = 5, children }: {
  color: string; progress?: number; size?: number; stroke?: number; children?: React.ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <View style={{ width: size, height: size }} className="items-center justify-center">
      <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeOpacity={0.18} strokeWidth={stroke} fill="none" />
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none" strokeLinecap="round" strokeDasharray={`${c * progress} ${c}`} />
      </Svg>
      {children}
    </View>
  );
}

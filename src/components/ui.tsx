import React from 'react';
import { Pressable, Text, TextInput, TextInputProps, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { cssInterop } from 'nativewind';
import { colors } from '../theme';

cssInterop(LinearGradient, { className: 'style' });

/** Join class names, skipping falsy values. */
export function cn(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(' ');
}

/** Shared typography classes. */
export const T = {
  h1: 'text-2xl font-black text-ink',
  h2: 'text-lg font-extrabold text-ink',
  h3: 'text-[15px] font-bold text-ink',
  body: 'text-sm text-muted leading-5',
  small: 'text-xs text-muted',
};

export type Tone = 'orange' | 'yellow' | 'blue' | 'green' | 'red' | 'purple' | 'pink' | 'cyan' | 'white';

const toneStyles: Record<Tone, { box: string; text: string }> = {
  orange: { box: 'bg-primary-soft', text: 'text-primary' },
  yellow: { box: 'bg-yellow-soft', text: 'text-yellow' },
  blue: { box: 'bg-blue-soft', text: 'text-blue' },
  green: { box: 'bg-green-soft', text: 'text-green' },
  red: { box: 'bg-red-soft', text: 'text-red' },
  purple: { box: 'bg-purple-soft', text: 'text-purple' },
  pink: { box: 'bg-pink-soft', text: 'text-pink' },
  cyan: { box: 'bg-cyan-100', text: 'text-cyan-600' },
  white: { box: 'bg-white', text: 'text-ink' },
};

export function Button({
  title,
  onPress,
  variant = "primary",
  icon,
  className,
  disabled,
}: {
  title: string;
  onPress?: () => void;
  variant?: "primary" | "outline" | "neutral" | "danger";
  icon?: React.ReactNode;
  className?: string;
  disabled?: boolean;
}) {
  const box =
    variant === "outline"
      ? "bg-white border-[1.5px] border-primary"
      : variant === "neutral"
        ? "bg-white border-[1.5px] border-line"
        : variant === "danger"
          ? "bg-red"
          : "bg-primary";
  const txt =
    variant === "outline"
      ? "text-primary"
      : variant === "neutral"
        ? "text-ink"
        : "text-white";
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={cn(
        "flex-row gap-2 items-center justify-center py-3.5 px-5 rounded-2xl active:opacity-80",
        box,
        disabled && "opacity-50",
        className,
      )}
    >
      {icon}
      <Text className={cn("font-bold text-[15px]", txt)}>{title}</Text>
    </Pressable>
  );
}

export function Card({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <View className={cn('bg-white rounded-3xl p-4 border border-line', className)}>{children}</View>;
}

export function Chip({
  label,
  tone = 'orange',
  active,
  onPress,
  className,
}: {
  label: string;
  tone?: Tone;
  active?: boolean;
  onPress?: () => void;
  className?: string;
}) {
  const s = active ? { box: 'bg-primary', text: 'text-white' } : (toneStyles[tone] ?? toneStyles.orange);
  const body = (
    <View className={cn('self-start rounded-full px-3 py-1', s.box, className)}>
      <Text className={cn('text-xs font-bold', s.text)}>{label}</Text>
    </View>
  );
  return onPress ? <Pressable onPress={onPress} className="self-start active:opacity-80">{body}</Pressable> : body;
}

export function Empty({ emoji, title, body }: { emoji: string; title: string; body?: string }) {
  return (
    <View className="items-center justify-center p-8 gap-1.5">
      <Text className="text-[56px]">{emoji}</Text>
      <Text className={T.h2}>{title}</Text>
      {!!body && <Text className={cn(T.body, 'text-center')}>{body}</Text>}
    </View>
  );
}

export function Field({
  label,
  hint,
  className,
  editable = true,
  ...props
}: TextInputProps & { label?: string; hint?: string; className?: string }) {
  return (
    <View className={className}>
      {!!label && <Text className="font-bold text-ink mb-1.5">{label}</Text>}
      <TextInput
        editable={editable}
        placeholderTextColor={colors.muted}
        className={cn(
          'border-[1.5px] border-line rounded-2xl px-4 py-3.5 text-[15px] text-ink',
          editable ? 'bg-white' : 'bg-primary-soft opacity-70',
        )}
        {...props}
      />
      {!!hint && <Text className={cn(T.small, 'mt-1')}>{hint}</Text>}
    </View>
  );
}

export function Gradient({
  children,
  className,
  colorsArr = ['#FFF1E3', '#FFE0C2'],
}: {
  children?: React.ReactNode;
  className?: string;
  colorsArr?: [string, string, ...string[]];
}) {
  return (
    <LinearGradient colors={colorsArr} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} className={className}>
      {children}
    </LinearGradient>
  );
}

export function SectionHeader({
  title,
  subtitle,
  icon,
  right,
}: {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <View className="flex-row items-center justify-between mb-3">
      <View className="flex-row items-center gap-2 flex-1">
        {icon}
        <View className="flex-1">
          <Text className={T.h2}>{title}</Text>
          {!!subtitle && <Text className={T.small}>{subtitle}</Text>}
        </View>
      </View>
      {right}
    </View>
  );
}

export function IconButton({
  name,
  onPress,
  badge,
}: {
  name: React.ComponentProps<typeof Ionicons>['name'];
  onPress?: () => void;
  badge?: number;
}) {
  return (
    <Pressable onPress={onPress} className="w-11 h-11 rounded-full bg-white border border-line items-center justify-center">
      <Ionicons name={name} size={22} color={colors.text} />
      {!!badge && (
        <View className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-primary items-center justify-center">
          <Text className="text-white text-[10px] font-bold">{badge}</Text>
        </View>
      )}
    </Pressable>
  );
}
import React, { useEffect, useRef, useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { colors } from '../theme';
import { isoToParts, todayInputValue, toIso } from '../utils/petAge';
import { cn } from './ui';

type Props = {
  label?: string;
  /** YYYY-MM-DD or '' */
  value: string;
  onChange: (iso: string) => void;
  /** Reject dates after this YYYY-MM-DD (e.g. today for a date of birth). */
  max?: string;
  min?: string;
  hint?: string;
};

/** DD / MM / YYYY entry - avoids pulling in a native date-picker dependency. */
export default function DateFields({ label, value, onChange, max, min, hint }: Props) {
  const init = isoToParts(value);
  const [day, setDay] = useState(init.day);
  const [month, setMonth] = useState(init.month);
  const [year, setYear] = useState(init.year);
  const monthRef = useRef<TextInput>(null);
  const yearRef = useRef<TextInput>(null);

  // keep in sync when the parent resets / prefills the value
  useEffect(() => {
    const current = toIso(day, month, year) ?? '';
    if (value !== current) {
      const p = isoToParts(value);
      setDay(p.day); setMonth(p.month); setYear(p.year);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const push = (d: string, m: string, y: string) => {
    const iso = toIso(d, m, y);
    onChange(iso && (!max || iso <= max) && (!min || iso >= min) ? iso : '');
  };

  const iso = toIso(day, month, year);
  const filled = day && month && year.length === 4;
  let error = '';
  if (filled && !iso) error = 'Enter a valid date.';
  else if (iso && max && iso > max) error = max === todayInputValue() ? "Date can't be in the future." : 'Date is too late.';
  else if (iso && min && iso < min) error = 'Date is too early.';

  const box = 'border-[1.5px] border-line rounded-2xl bg-white px-3 py-3.5 text-[15px] text-ink text-center';

  return (
    <View>
      {!!label && <Text className="font-bold text-ink mb-1.5">{label}</Text>}
      <View className="flex-row gap-2 items-center">
        <TextInput
          value={day} placeholder="DD" maxLength={2} keyboardType="number-pad" placeholderTextColor={colors.muted}
          onChangeText={(t) => { const v = t.replace(/\D/g, ''); setDay(v); push(v, month, year); if (v.length === 2) monthRef.current?.focus(); }}
          className={cn(box, 'w-16')}
        />
        <Text className="text-muted">/</Text>
        <TextInput
          ref={monthRef} value={month} placeholder="MM" maxLength={2} keyboardType="number-pad" placeholderTextColor={colors.muted}
          onChangeText={(t) => { const v = t.replace(/\D/g, ''); setMonth(v); push(day, v, year); if (v.length === 2) yearRef.current?.focus(); }}
          className={cn(box, 'w-16')}
        />
        <Text className="text-muted">/</Text>
        <TextInput
          ref={yearRef} value={year} placeholder="YYYY" maxLength={4} keyboardType="number-pad" placeholderTextColor={colors.muted}
          onChangeText={(t) => { const v = t.replace(/\D/g, ''); setYear(v); push(day, month, v); }}
          className={cn(box, 'flex-1')}
        />
      </View>
      {!!error && <Text className="text-xs text-red mt-1">{error}</Text>}
      {!error && !!hint && <Text className="text-xs text-muted mt-1">{hint}</Text>}
    </View>
  );
}

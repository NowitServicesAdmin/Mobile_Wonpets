import React from 'react';
import { Linking, Text, View } from 'react-native';
import { colors } from '../../theme';
import { COMPANY, type LegalBlock, type LegalDoc } from '../../data/legal';

/** Renders **bold** pieces inside a line of text. */
function Rich({ text, className, style }: { text: string; className?: string; style?: object }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  return (
    <Text className={className} style={style}>
      {parts.map((s, i) => (s.startsWith('**') ? <Text key={i} className="font-extrabold text-ink">{s.slice(2, -2)}</Text> : <Text key={i}>{s}</Text>))}
    </Text>
  );
}

const NOTE_TONE = {
  info: { box: 'bg-orange-50 border-orange-100', text: 'text-ink' },
  key: { box: 'bg-orange-100 border-orange-200', text: 'text-ink' },
  warn: { box: 'bg-red-soft border-red/30', text: 'text-red' },
} as const;

function Block({ b }: { b: LegalBlock }) {
  switch (b.t) {
    case 'p':
      return <Rich text={b.text} className="text-[13.5px] leading-[21px] text-slate-600 mb-2.5" />;
    case 'sub':
      return <Text maxFontSizeMultiplier={1.2} className="text-[12px] font-extrabold text-muted uppercase tracking-wider mt-2 mb-1.5">{b.text}</Text>;
    case 'ul':
      return (
        <View className="mb-2.5 gap-1.5">
          {b.items.map((it, i) => (
            <View key={i} className="flex-row gap-2.5 pr-1">
              <View className="w-1.5 h-1.5 rounded-full mt-[8px]" style={{ backgroundColor: colors.primary }} />
              <Rich text={it} className="flex-1 text-[13.5px] leading-[21px] text-slate-600" />
            </View>
          ))}
        </View>
      );
    case 'note': {
      const tone = NOTE_TONE[b.tone ?? 'info'];
      return (
        <View className={`rounded-2xl border px-3.5 py-3 my-1.5 mb-3 ${tone.box}`}>
          <Rich text={b.text} className={`text-[13px] leading-5 ${tone.text}`} />
        </View>
      );
    }
    case 'contact':
      return (
        <View className="mb-1">
          <Text className="text-[13.5px] leading-[21px] text-slate-600 mb-2">
            If you have any questions or concerns about this document, or want to exercise any right described in it, contact <Text className="font-extrabold text-ink">{COMPANY.legalName}</Text>:
          </Text>
          <View className="gap-1.5">
            <Text className="text-[13.5px] text-slate-600">Phone: <Text onPress={() => Linking.openURL(`tel:${COMPANY.phone.replace(/\s/g, '')}`)} className="font-bold text-primary">{COMPANY.phone}</Text></Text>
            <Text className="text-[13.5px] text-slate-600">Email: <Text onPress={() => Linking.openURL(`mailto:${COMPANY.email}`)} className="font-bold text-primary">{COMPANY.email}</Text></Text>
            <Text className="text-[13.5px] leading-[21px] text-slate-600">Address: {COMPANY.address}</Text>
          </View>
        </View>
      );
  }
}

/** One policy: title card (version + last-updated) and its numbered sections. */
export default function LegalDocument({ doc }: { doc: LegalDoc }) {
  return (
    <View className="gap-3">
      <View className="rounded-3xl bg-white border border-orange-100 p-4">
        <Text maxFontSizeMultiplier={1.2} className="text-[20px] font-black text-ink">{doc.title}</Text>
        <Text className="text-[13px] leading-5 text-muted mt-1">{doc.subtitle}</Text>
        <View className="flex-row flex-wrap gap-2 mt-3">
          <View className="rounded-full bg-primary-soft px-3 py-1"><Text className="text-[12px] font-bold text-primary">Version {doc.version}</Text></View>
          <View className="rounded-full bg-cream border border-line px-3 py-1"><Text className="text-[12px] font-semibold text-muted">Last updated {doc.updated}</Text></View>
        </View>
      </View>
      {doc.sections.map((s, i) => (
        <View key={s.id} className="rounded-3xl bg-white border border-orange-100 p-4">
          <View className="flex-row items-center gap-2.5 mb-2.5">
            <View className="w-7 h-7 rounded-lg bg-primary-soft items-center justify-center"><Text className="text-[12px] font-black text-primary">{i + 1}</Text></View>
            <Text maxFontSizeMultiplier={1.2} className="flex-1 text-[15.5px] font-extrabold text-ink">{s.title}</Text>
          </View>
          {s.blocks.map((b, j) => <Block key={j} b={b} />)}
        </View>
      ))}
    </View>
  );
}

import React from 'react';
import { Image, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card, T, cn } from '../ui';
import type { ClassifyResult } from '../../services/shared.service';

const Block = ({ title, children }: { title: string; children?: React.ReactNode }) => (
  <View className="bg-primary-soft rounded-2xl p-3.5 gap-1"><Text className="text-[11px] font-extrabold text-primary uppercase">{title}</Text>{children}</View>
);
const Row = ({ k, v }: { k: string; v?: string }) => (!v ? null : <Text className="text-sm text-ink"><Text className="font-bold">{k}: </Text>{v}</Text>);

/** Result of "search by image" - handles the three shapes the backend returns (product, disease, animal/breed), like the web modal. */
export default function ImageResultCard({ uri, result }: { uri: string; result: ClassifyResult }) {
  const conf = Number(result.confidence ?? 0);
  const confCls = conf >= 70 ? 'bg-green-soft text-green' : conf >= 40 ? 'bg-primary-soft text-primary' : 'bg-red-soft text-red';
  const [confBg, confText] = confCls.split(' ');
  const title = result.type === 'product' ? result.label : result.type === 'disease' ? result.affectedAnimal || 'Animal' : result.breed;
  const plain = result.details?.description?.replace(/<[^>]*>/g, '').slice(0, 220);
  const urgencyTone = result.urgency === 'high' ? 'text-red' : result.urgency === 'medium' ? 'text-primary' : 'text-green';

  return (
    <Card className="gap-3">
      <View className="rounded-2xl overflow-hidden h-[190px] bg-primary-soft">
        <Image source={{ uri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
        <View className="absolute bottom-2.5 left-2.5 right-2.5 flex-row items-center justify-between">
          <View className="bg-white/90 rounded-full px-3 py-1.5 max-w-[68%]"><Text className="font-bold text-ink text-[13px]" numberOfLines={1}>{title || 'Unknown'}</Text></View>
          {!!conf && <View className={cn('rounded-full px-2.5 py-1', confBg)}><Text className={cn('text-xs font-bold', confText)}>{conf}% match</Text></View>}
        </View>
      </View>

      {result.type === 'product' && (
        <Block title={`${result.productCategory ?? 'Product'}${result.targetAnimal ? ` · for ${result.targetAnimal}` : ''}`}>
          <Row k="How to use" v={result.usageInstructions} /><Row k="Amount" v={result.dosageOrAmount} /><Row k="Safety" v={result.safetyNotes} />
        </Block>
      )}
      {result.type === 'disease' && (
        <>
          <View className="flex-row items-center gap-1.5"><Ionicons name="alert-circle" size={16} color="#F97316" /><Text className={cn('font-bold capitalize', urgencyTone)}>{result.urgency || 'unknown'} urgency</Text></View>
          {!!result.visibleSymptoms && <Block title="Visible symptoms"><Text className="text-sm text-ink">{result.visibleSymptoms}</Text></Block>}
          {!!result.possibleConditions && <Block title="Possible conditions"><Text className="text-sm text-ink">{result.possibleConditions}</Text></Block>}
          {!!result.generalCareAdvice && <Block title="General care"><Text className="text-sm text-ink">{result.generalCareAdvice}</Text></Block>}
        </>
      )}
      {result.type !== 'product' && result.type !== 'disease' && (
        <>
          {!!plain && <Block title="About"><Text className="text-sm text-ink leading-5">{plain}…</Text></Block>}
          {!!result.feedingGuide && <Block title="Feeding guide"><Row k="Food" v={result.feedingGuide.foodType} /><Row k="Frequency" v={result.feedingGuide.frequency} />{!!result.feedingGuide.notes && <Text className="text-sm text-ink">{result.feedingGuide.notes}</Text>}</Block>}
          {!!result.careNotes && <Block title="Care notes"><Text className="text-sm text-ink">{result.careNotes}</Text></Block>}
        </>
      )}
      <Text className={cn(T.small, 'italic')}>{result.vetDisclaimer || (result.type === 'disease' ? 'This is not a diagnosis. Please consult a licensed vet for an accurate assessment.' : 'Always confirm with the product label or your vet.')}</Text>
    </Card>
  );
}

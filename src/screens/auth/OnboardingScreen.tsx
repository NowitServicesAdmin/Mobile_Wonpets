import React, { useRef, useState } from 'react';
import { Dimensions, FlatList, Image, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, cn } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';

const { width } = Dimensions.get('window');
const slides = [
  { image: require('../../assets/onboard-pets.png'), title: 'All your pets, one place', body: 'Keep profiles, weight, age and health records for every member of your furry family.' },
  { image: require('../../assets/onboard-vet.png'), title: 'Vet care made easy', body: 'Book clinic visits, online consults and emergencies, and track every appointment.' },
  { image: require('../../assets/onboard-shop.png'), title: 'Shop & resell', body: 'Buy food, accessories and pets from trusted stores, or resell items you no longer need.' },
];

export default function OnboardingScreen() {
  const { finishOnboarding } = useAuth();
  const [index, setIndex] = useState(0);
  const ref = useRef<FlatList>(null);
  const last = index === slides.length - 1;
  const next = () => (last ? finishOnboarding() : ref.current?.scrollToIndex({ index: index + 1 }));

  return (
    <SafeAreaView className="flex-1 bg-cream">
      <View className="flex-row justify-end p-5 h-[60px]">
        {!last ? <Pressable onPress={finishOnboarding}><Text className="text-primary font-extrabold text-base">Skip</Text></Pressable> : <View />}
      </View>
      <FlatList
        ref={ref}
        data={slides}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(i) => i.title}
        onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
        renderItem={({ item }) => (
          <View style={{ width }} className="items-center px-8 justify-center">
            <View style={{ width: width - 64, height: (width - 64) * 0.62 }} className="rounded-3xl bg-primary-soft items-center justify-center border-2 border-orange-200 mb-8 overflow-hidden">
              <Image source={item.image} style={{ width: '94%', height: '94%' }} resizeMode="contain" />
            </View>
            <Text className="text-[26px] font-extrabold text-ink text-center">{item.title}</Text>
            <Text className="text-[15px] text-muted text-center mt-2.5 leading-[22px]">{item.body}</Text>
          </View>
        )}
      />
      <View className="flex-row justify-center gap-1.5">
        {slides.map((_, i) => <View key={i} className={cn('h-2 rounded-full', i === index ? 'w-6 bg-primary' : 'w-2 bg-orange-200')} />)}
      </View>
      <View className="p-6"><Button title={last ? 'Get started' : 'Next'} onPress={next} /></View>
    </SafeAreaView>
  );
}

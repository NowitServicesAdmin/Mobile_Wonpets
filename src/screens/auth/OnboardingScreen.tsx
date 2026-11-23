import React, { useRef, useState } from 'react';
import { FlatList, Image, ImageSourcePropType, LayoutChangeEvent, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient as SvgGradient, Path, Stop } from 'react-native-svg';
import { BottomHills } from '../../components/auth/AuthArt';
import BrandLogo from '../../components/BrandLogo';
import { Button, cn } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { gradients } from '../../theme';

type Slide = { kind: string; image: ImageSourcePropType; ratio: number; line1: string; line2: string; body: string };

// ratio = image width / image height
const slides: Slide[] = [
  {
    kind: 'health',
    image: require('../../assets/onboard-pets.png'),
    ratio: 1448 / 1086,
    line1: 'Monitor Your Pet’s',
    line2: 'Health & Wellbeing',
    body: 'Track health, build good habits, and keep all your pet records in one place.',
  },
  {
    kind: 'vet',
    image: require('../../assets/onboard-vet.png'),
    ratio: 1199 / 1312,
    line1: 'Book Appointments &',
    line2: 'Consult Doctors',
    body: 'Schedule visits, get online consultations, and manage all medical records easily.',
  },
  {
    kind: 'shop',
    image: require('../../assets/onboard-shop.png'),
    ratio: 1307 / 1179,
    line1: 'Shop for Pet Essentials',
    line2: '& Save More',
    body: 'Buy food, accessories, and care products for your pet with exciting coupons and special offers.',
  },
];

const TEXT_H = 132; // fixed text block so the copy never jumps between slides

/** Soft cream waves behind the artwork, as in the design. */
function WaveBackdrop() {
  return (
    <Svg style={StyleSheet.absoluteFill} viewBox="0 0 360 800" preserveAspectRatio="none" pointerEvents="none">
      <Defs>
        <SvgGradient id="wave1" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.7" />
          <Stop offset="1" stopColor="#FFE9D5" stopOpacity="0.35" />
        </SvgGradient>
      </Defs>
      <Path d="M0 120 C70 92 140 150 215 128 C285 108 330 84 360 96 L360 800 L0 800 Z" fill="url(#wave1)" />
      <Path d="M0 430 C80 402 150 458 230 440 C290 426 330 412 360 420 L360 800 L0 800 Z" fill="#FFE2C8" opacity={0.3} />
    </Svg>
  );
}

export default function OnboardingScreen() {
  const { finishOnboarding } = useAuth();
  const [index, setIndex] = useState(0);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const ref = useRef<FlatList<Slide>>(null);
  const { width: screenW } = useWindowDimensions();
  const last = index === slides.length - 1;

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width !== size.w || height !== size.h) setSize({ w: width, h: height });
  };
  const next = () => {
    if (last) finishOnboarding();
    else ref.current?.scrollToIndex({ index: index + 1, animated: true });
  };

  // art box: as tall as the screen allows (never taller than ~1.05 x width), image fills it edge to edge
  const artH = Math.max(160, Math.min(size.w * 1.0, size.h - TEXT_H - 12));

  return (
    <LinearGradient colors={gradients.screen} style={{ flex: 1 }}>
      <WaveBackdrop />
      {/* peach hills behind the Next button */}
      <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}>
        <BottomHills width={screenW} height={120} />
      </View>
      <SafeAreaView className="flex-1">
        {/* brand at the start, Skip at the end */}
        <View className="flex-row items-center justify-between px-5 pt-2 pb-1">
          <BrandLogo layout="row" size="md" />
          <Pressable
            onPress={finishOnboarding}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Skip onboarding"
          >
            <Text className="text-primary font-bold text-[14px]">Skip</Text>
          </Pressable>
        </View>

        {/* slides */}
        <View className="flex-1" onLayout={onLayout}>
          {size.w > 0 && (
            <FlatList
              ref={ref}
              data={slides}
              horizontal
              pagingEnabled
              bounces={false}
              showsHorizontalScrollIndicator={false}
              keyExtractor={(s) => s.kind}
              getItemLayout={(_, i) => ({ length: size.w, offset: size.w * i, index: i })}
              onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / size.w))}
              renderItem={({ item }) => {
                let iw = size.w;
                let ih = iw / item.ratio;
                if (ih > artH) { ih = artH; iw = ih * item.ratio; }
                return (
                  <View style={{ width: size.w, height: size.h, justifyContent: 'flex-start', paddingTop: 4 }}>
                    {/* artwork: full width, sitting right above the copy */}
                    <View style={{ height: artH, alignItems: 'center', justifyContent: 'flex-end' }}>
                      <Image source={item.image} style={{ width: iw, height: ih }} resizeMode="contain" />
                    </View>
                    <View className="items-center px-9 pt-2" style={{ height: TEXT_H }}>
                      <Text className="text-[24px] leading-[30px] font-extrabold text-navy text-center">{item.line1}</Text>
                      <Text className="text-[24px] leading-[30px] font-extrabold text-primary text-center">{item.line2}</Text>
                      <Text className="text-[14px] leading-[20px] text-muted text-center mt-2">{item.body}</Text>
                    </View>
                  </View>
                );
              }}
            />
          )}
        </View>

        {/* dots + CTA */}
        <View className="flex-row justify-center items-center gap-2 pt-1">
          {slides.map((s, i) => (
            <View key={s.kind} className={cn('h-2 rounded-full', i === index ? 'w-6 bg-primary' : 'w-2 bg-orange-200')} />
          ))}
        </View>
        <View className="px-6 pt-4 pb-4">
          <Button title={last ? 'Get Started' : 'Next'} onPress={next} arrow />
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}
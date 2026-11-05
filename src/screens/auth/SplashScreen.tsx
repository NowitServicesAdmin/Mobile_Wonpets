import React, { useEffect, useRef } from 'react';
import { Animated, Image, View } from 'react-native';

export default function SplashScreen() {
  const scale = useRef(new Animated.Value(0.6)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 600, useNativeDriver: true }),
    ]).start();
  }, []);
  return (
    <View className="flex-1 bg-primary items-center justify-center">
      <Animated.View style={{ transform: [{ scale }], opacity }}>
        <Image source={require('../../assets/logo.png')} style={{ width: 120, height: 120, borderRadius: 28 }} />
      </Animated.View>
      <Animated.Text style={{ opacity }} className="text-white text-[28px] font-black mt-[18px] tracking-widest">WON PET PRO</Animated.Text>
      <Animated.Text style={{ opacity }} className="text-orange-100 mt-1 text-sm">Love for Life ♥</Animated.Text>
    </View>
  );
}
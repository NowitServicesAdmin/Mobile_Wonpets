import React, { useEffect, useRef } from 'react';
import { Animated, Image, View } from 'react-native';
import { BrandWordmark } from '../../components/BrandLogo';

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
      <Animated.View style={{ opacity, marginTop: 18 }}>
        <BrandWordmark variant="onOrange" size="xl" align="center" />
      </Animated.View>
    </View>
  );
}
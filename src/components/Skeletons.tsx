import React, { useEffect } from 'react';
import { Animated, Easing, StyleSheet, View, ViewStyle } from 'react-native';
import { Card, cn } from './ui';

/* One shared pulse so every block on a screen breathes in sync (and we only run one native animation). */
const pulse = new Animated.Value(0.45);
let users = 0;
let loop: Animated.CompositeAnimation | null = null;
function start() {
  if (users++ > 0) return;
  loop = Animated.loop(
    Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 750, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0.45, duration: 750, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ])
  );
  loop.start();
}
function stop() {
  if (--users > 0) return;
  loop?.stop();
  loop = null;
}

/** A single grey block that pulses. Size it with className (e.g. `h-4 w-1/2`) or `style`. */
export function Skeleton({ className, style, round }: { className?: string; style?: ViewStyle; round?: boolean }) {
  useEffect(() => { start(); return stop; }, []);
  return (
    <View style={style} className={cn('overflow-hidden bg-[#F3E7DA]', round ? 'rounded-full' : 'rounded-xl', className)}>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: '#E8D7C4', opacity: pulse }]} />
    </View>
  );
}

/** Wrapper for a whole skeleton screen: announces the loading state to screen readers. */
export function SkeletonScreen({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <View accessible accessibilityRole="progressbar" accessibilityLabel="Loading" className={cn('flex-1 bg-cream', className)}>
      {children}
    </View>
  );
}

/* ------------------------------ store ------------------------------ */

export function ProductCardSkeleton() {
  return (
    <View className="flex-1 bg-white rounded-3xl p-2.5 mb-3 gap-2 border border-line">
      <Skeleton className="h-[120px] w-full rounded-2xl" />
      <Skeleton className="h-2.5 w-12" />
      <Skeleton className="h-4 w-4/5" />
      <Skeleton className="h-5 w-2/5" />
      <View className="flex-row items-center justify-between">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-[34px] w-[34px]" round />
      </View>
    </View>
  );
}

/** Two-column grid of product placeholders. Rendered inside a FlatList footer/empty slot or on its own. */
export function ProductGridSkeleton({ count = 6 }: { count?: number }) {
  const rows = Array.from({ length: Math.ceil(count / 2) });
  return (
    <View>
      {rows.map((_, i) => (
        <View key={i} className="flex-row gap-3"><ProductCardSkeleton /><ProductCardSkeleton /></View>
      ))}
    </View>
  );
}

export function OfferCarouselSkeleton() {
  return <Skeleton className="h-[170px] w-full rounded-3xl" />;
}

export function CategoryRowSkeleton() {
  return (
    <View className="flex-row gap-2.5">
      {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[78px] w-[84px] rounded-2xl" />)}
    </View>
  );
}

export function StoreScreenSkeleton() {
  return (
    <View className="gap-3.5 p-4">
      <Skeleton className="h-[46px] w-full rounded-3xl" />
      <OfferCarouselSkeleton />
      <Skeleton className="h-5 w-40" />
      <CategoryRowSkeleton />
      <ProductGridSkeleton />
    </View>
  );
}

export function ProductDetailSkeleton() {
  return (
    <SkeletonScreen>
      <Skeleton className="h-[300px] w-full rounded-none" />
      <View className="p-4 gap-3">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-7 w-4/5" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-11/12" />
        <Skeleton className="h-4 w-2/3" />
        <View className="flex-row gap-3 mt-2"><Skeleton className="h-[50px] flex-1 rounded-2xl" /><Skeleton className="h-[50px] flex-1 rounded-2xl" /></View>
      </View>
    </SkeletonScreen>
  );
}

/** Cart / wishlist / order line: thumbnail + three text rows. */
export function LineItemSkeleton() {
  return (
    <Card className="flex-row gap-3">
      <Skeleton className="h-[78px] w-[78px] rounded-2xl" />
      <View className="flex-1 gap-2 justify-center">
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="h-5 w-1/2" />
      </View>
    </Card>
  );
}

export function CartSkeleton() {
  return (
    <SkeletonScreen className="p-4 gap-3">
      <LineItemSkeleton /><LineItemSkeleton /><LineItemSkeleton />
      <Card className="gap-3">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-3 w-full" /><Skeleton className="h-3 w-full" /><Skeleton className="h-5 w-full" />
        <Skeleton className="h-[48px] w-full rounded-2xl" />
      </Card>
    </SkeletonScreen>
  );
}

export function WishlistSkeleton() {
  return (
    <SkeletonScreen className="p-4"><ProductGridSkeleton count={6} /></SkeletonScreen>
  );
}

export function OrderCardSkeleton() {
  return (
    <Card className="gap-3">
      <View className="flex-row justify-between"><Skeleton className="h-4 w-32" /><Skeleton className="h-5 w-20" round /></View>
      <View className="flex-row gap-3">
        <Skeleton className="h-[56px] w-[56px] rounded-2xl" />
        <View className="flex-1 gap-2 justify-center"><Skeleton className="h-3.5 w-3/4" /><Skeleton className="h-3 w-1/2" /></View>
      </View>
      <Skeleton className="h-[40px] w-full rounded-2xl" />
    </Card>
  );
}

export function OrdersSkeleton() {
  return (
    <SkeletonScreen className="p-4 gap-3">
      <View className="flex-row gap-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-8 w-20" round />)}</View>
      <OrderCardSkeleton /><OrderCardSkeleton /><OrderCardSkeleton />
    </SkeletonScreen>
  );
}

export function OrderDetailSkeleton() {
  return (
    <SkeletonScreen className="p-4 gap-3">
      <Card className="gap-3"><Skeleton className="h-5 w-1/2" /><Skeleton className="h-3 w-1/3" /><Skeleton className="h-3 w-full" /></Card>
      <Card className="gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <View key={i} className="flex-row gap-3 items-center"><Skeleton className="h-8 w-8" round /><View className="flex-1 gap-1.5"><Skeleton className="h-3.5 w-1/2" /><Skeleton className="h-3 w-1/3" /></View></View>
        ))}
      </Card>
      <LineItemSkeleton /><LineItemSkeleton />
    </SkeletonScreen>
  );
}

/* --------------------------- appointments --------------------------- */

export function AppointmentCardSkeleton() {
  return (
    <Card className="flex-row gap-3.5 p-3.5">
      <Skeleton className="h-[66px] w-[60px] rounded-2xl" />
      <View className="flex-1 gap-2.5">
        <View className="flex-row items-center justify-between"><Skeleton className="h-4 w-24" /><Skeleton className="h-5 w-20" round /></View>
        <Skeleton className="h-3 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </View>
    </Card>
  );
}

export function AppointmentListSkeleton({ count = 3 }: { count?: number }) {
  return <View className="gap-3.5">{Array.from({ length: count }).map((_, i) => <AppointmentCardSkeleton key={i} />)}</View>;
}

export function AppointmentDetailSkeleton() {
  return (
    <SkeletonScreen className="p-4 gap-3">
      <Card className="gap-3"><View className="flex-row gap-2"><Skeleton className="h-6 w-20" round /><Skeleton className="h-6 w-24" round /></View><Skeleton className="h-6 w-1/2" /><Skeleton className="h-3 w-1/3" /></Card>
      <Card className="gap-3"><Skeleton className="h-4 w-1/3" /><Skeleton className="h-[60px] w-full rounded-2xl" /></Card>
      <Card className="gap-3"><Skeleton className="h-4 w-1/3" /><Skeleton className="h-3 w-full" /><Skeleton className="h-3 w-5/6" /></Card>
      <Skeleton className="h-[48px] w-full rounded-2xl" />
    </SkeletonScreen>
  );
}

/* ----------------------------- dashboard ----------------------------- */

export function DashboardSkeleton() {
  return (
    <SkeletonScreen className="p-4 gap-4">
      <Skeleton className="h-[170px] w-full rounded-3xl" />
      <View className="flex-row gap-3"><Skeleton className="h-[84px] flex-1 rounded-2xl" /><Skeleton className="h-[84px] flex-1 rounded-2xl" /><Skeleton className="h-[84px] flex-1 rounded-2xl" /></View>
      <Skeleton className="h-5 w-32" />
      <View className="flex-row gap-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-[110px] w-[96px] rounded-2xl" />)}</View>
      <Skeleton className="h-5 w-40" />
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i} className="flex-row items-center gap-3"><Skeleton className="h-10 w-10" round /><View className="flex-1 gap-2"><Skeleton className="h-4 w-1/2" /><Skeleton className="h-3 w-3/4" /></View></Card>
      ))}
    </SkeletonScreen>
  );
}

/* ------------------------- lists / chat / misc ------------------------- */

export function NotificationRowSkeleton() {
  return (
    <View className="flex-row gap-3 p-3.5 bg-white rounded-2xl border border-line">
      <Skeleton className="h-10 w-10" round />
      <View className="flex-1 gap-2"><Skeleton className="h-4 w-2/3" /><Skeleton className="h-3 w-full" /><Skeleton className="h-3 w-1/4" /></View>
    </View>
  );
}
export function NotificationsSkeleton() {
  return <SkeletonScreen className="p-4 gap-2.5">{Array.from({ length: 7 }).map((_, i) => <NotificationRowSkeleton key={i} />)}</SkeletonScreen>;
}

export function ChatRowSkeleton() {
  return (
    <View className="flex-row items-center gap-3 px-4 py-3">
      <Skeleton className="h-[48px] w-[48px]" round />
      <View className="flex-1 gap-2"><Skeleton className="h-4 w-1/2" /><Skeleton className="h-3 w-4/5" /></View>
      <Skeleton className="h-3 w-10" />
    </View>
  );
}
export function ChatListSkeleton({ count = 6 }: { count?: number }) {
  return <View>{Array.from({ length: count }).map((_, i) => <ChatRowSkeleton key={i} />)}</View>;
}

export function ListingCardSkeleton() {
  return (
    <View className="flex-1 bg-white rounded-3xl p-2.5 mb-3 gap-2 border border-line">
      <Skeleton className="h-[130px] w-full rounded-2xl" />
      <Skeleton className="h-4 w-4/5" />
      <Skeleton className="h-5 w-1/2" />
      <Skeleton className="h-3 w-2/3" />
    </View>
  );
}
export function ListingGridSkeleton({ count = 6 }: { count?: number }) {
  return <View>{Array.from({ length: Math.ceil(count / 2) }).map((_, i) => <View key={i} className="flex-row gap-3"><ListingCardSkeleton /><ListingCardSkeleton /></View>)}</View>;
}
export function MyListingsSkeleton() {
  return <View className="gap-3">{Array.from({ length: 3 }).map((_, i) => <LineItemSkeleton key={i} />)}</View>;
}
export function ListingDetailSkeleton() {
  return <ProductDetailSkeleton />;
}

export function PetProfileSkeleton() {
  return (
    <SkeletonScreen className="p-4 gap-4">
      <View className="items-center gap-3"><Skeleton className="h-[110px] w-[110px]" round /><Skeleton className="h-6 w-40" /><Skeleton className="h-3 w-28" /></View>
      <View className="flex-row gap-3"><Skeleton className="h-[70px] flex-1 rounded-2xl" /><Skeleton className="h-[70px] flex-1 rounded-2xl" /><Skeleton className="h-[70px] flex-1 rounded-2xl" /></View>
      <Card className="gap-3"><Skeleton className="h-4 w-1/3" /><Skeleton className="h-3 w-full" /><Skeleton className="h-3 w-5/6" /></Card>
      <Card className="gap-3"><Skeleton className="h-4 w-1/3" /><Skeleton className="h-[140px] w-full rounded-2xl" /></Card>
    </SkeletonScreen>
  );
}

export function PrescriptionSkeleton() {
  return (
    <SkeletonScreen className="p-4 gap-3">
      <Card className="gap-3"><Skeleton className="h-5 w-1/2" /><Skeleton className="h-3 w-1/3" /><Skeleton className="h-3 w-full" /></Card>
      <Card className="gap-3">{Array.from({ length: 3 }).map((_, i) => <View key={i} className="gap-1.5"><Skeleton className="h-4 w-1/2" /><Skeleton className="h-3 w-3/4" /></View>)}</Card>
    </SkeletonScreen>
  );
}

/** Settings sections that wait for the server (e.g. Additional Information). */
export function FormSkeleton({ fields = 4 }: { fields?: number }) {
  return (
    <View className="gap-3.5">
      {Array.from({ length: fields }).map((_, i) => (
        <View key={i} className="gap-1.5"><Skeleton className="h-3.5 w-24" /><Skeleton className="h-[50px] w-full rounded-2xl" /></View>
      ))}
      <Skeleton className="h-[48px] w-full rounded-2xl" />
    </View>
  );
}

/** Small inline text placeholder - used by the header's location line. */
export function TextSkeleton({ width = 110 }: { width?: number }) {
  return <Skeleton style={{ width, height: 10 }} className="rounded-md" />;
}

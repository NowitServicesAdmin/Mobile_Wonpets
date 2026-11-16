import React, { useEffect, useRef } from 'react';
import { Animated, Modal, Platform, Pressable, ScrollView, StatusBar, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** Where the tapped element sits on screen (screen coordinates, status bar included). */
export type Anchor = { x: number; y: number; width: number; height: number };

/**
 * Measure a view and hand back its on-screen rectangle (used to open a popover right under it).
 * On Android `measureInWindow` leaves the status bar out, but the popover's Modal starts at the very top of the
 * screen, so the status bar height is added back here. Without it the card opened one status-bar too high and
 * covered the avatar / status button it belongs to.
 */
export function measureAnchor(ref: React.RefObject<any>, done: (a: Anchor) => void) {
  const statusBar = Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 0;
  ref.current?.measureInWindow((x: number, y: number, width: number, height: number) => done({ x, y: y + statusBar, width, height }));
}

/** Ref to put on the element a popover should open under (any native view / Pressable). */
export function useAnchorRef() {
  return useRef<any>(null);
}

const GAP = 8;
const EDGE = 12;
const CARET = 12;

/**
 * Small card that drops down right under the element that opened it (instead of a bottom sheet).
 * Tap anywhere outside to close. The little caret points at the anchor.
 *
 * Works on any screen size: the card is never wider than the screen, lines up with the left edge of the anchor
 * (or the right edge when the anchor sits in the right half, e.g. the bell), stays inside the safe area, opens
 * above the anchor when there is no room below, and scrolls if it is taller than the space it has.
 */
export default function Popover({
  visible, onClose, anchor, width = 290, children,
}: { visible: boolean; onClose: () => void; anchor: Anchor | null; width?: number; children: React.ReactNode }) {
  const { width: screenW, height: screenH } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const op = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    op.setValue(0);
    Animated.timing(op, { toValue: 1, duration: 170, useNativeDriver: true }).start();
  }, [visible]);

  if (!visible || !anchor) return null;

  const w = Math.min(width, screenW - EDGE * 2);
  const anchorMid = anchor.x + anchor.width / 2;
  // line up with the anchor's left edge, or its right edge when it sits in the right half of the screen
  const wanted = anchorMid > screenW / 2 ? anchor.x + anchor.width - w : anchor.x;
  const left = Math.min(Math.max(EDGE, wanted), screenW - w - EDGE);
  // caret sits under the middle of the anchor, kept inside the card's rounded corners
  const caretLeft = Math.min(Math.max(anchorMid - left - CARET / 2, 18), w - 18 - CARET);

  const minTop = insets.top + EDGE;
  const maxBottom = screenH - Math.max(insets.bottom, EDGE) - EDGE;
  const below = maxBottom - (anchor.y + anchor.height + GAP);
  const above = anchor.y - GAP - minTop;
  const openUp = below < 200 && above > below; // not enough room underneath
  const room = Math.max(120, openUp ? above : below);
  const top = openUp ? undefined : anchor.y + anchor.height + GAP;
  const bottom = openUp ? screenH - anchor.y + GAP : undefined;

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <Pressable style={{ flex: 1 }} onPress={onClose} accessibilityLabel="Close" />
      <Animated.View
        pointerEvents="box-none"
        style={{
          position: 'absolute', top, bottom, left, width: w, opacity: op,
          transform: [{ translateY: op.interpolate({ inputRange: [0, 1], outputRange: [openUp ? 8 : -8, 0] }) }, { scale: op.interpolate({ inputRange: [0, 1], outputRange: [0.97, 1] }) }],
        }}
      >
        <View
          className="bg-white rounded-2xl border border-line overflow-hidden"
          style={{ maxHeight: room, elevation: 14, shadowColor: '#7C2D12', shadowOpacity: 0.18, shadowRadius: 18, shadowOffset: { width: 0, height: 8 } }}
        >
          <View style={{ padding: 8 }}>{children}</View>
        </View>
        {/* caret */}
        <View
          pointerEvents="none"
          style={{
            position: 'absolute', left: caretLeft, width: CARET, height: CARET, backgroundColor: '#fff', borderColor: '#F6E3D0', transform: [{ rotate: '45deg' }],
            ...(openUp ? { bottom: -CARET / 2, borderRightWidth: 1, borderBottomWidth: 1 } : { top: -CARET / 2, borderLeftWidth: 1, borderTopWidth: 1 }),
          }}
        />
      </Animated.View>
    </Modal>
  );
}
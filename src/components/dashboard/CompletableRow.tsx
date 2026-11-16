import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Text, View } from 'react-native';
import { T } from '../ui';

const HOLD_MS = 450; // let the green tick show for a moment before the row leaves
const COLLAPSE_MS = 320;

/**
 * Wraps one row of Today's Schedule. Once `done` turns true the row keeps its tick for a beat, then fades,
 * slides out and collapses its height, and is finally removed from the list.
 * A row that is already completed when the list loads is simply not shown (no animation).
 * If `done` flips back (e.g. the request failed and the task was reverted) the row comes back.
 */
export default function CompletableRow({ done, children, gap = 8 }: { done: boolean; children: React.ReactNode; gap?: number }) {
  const [gone, setGone] = useState(done);
  const [collapsing, setCollapsing] = useState(false);
  const height = useRef(0);
  const prog = useRef(new Animated.Value(1)).current; // 1 = fully visible, 0 = hidden

  useEffect(() => {
    if (!done) { setGone(false); setCollapsing(false); prog.setValue(1); return; }
    if (gone) return;
    const t = setTimeout(() => {
      setCollapsing(true);
      Animated.timing(prog, { toValue: 0, duration: COLLAPSE_MS, easing: Easing.out(Easing.cubic), useNativeDriver: false })
        .start(({ finished }) => { if (finished) setGone(true); });
    }, HOLD_MS);
    return () => clearTimeout(t);
  }, [done]);

  if (gone) return null;

  const style = collapsing
    ? {
        height: prog.interpolate({ inputRange: [0, 1], outputRange: [0, height.current] }),
        opacity: prog,
        marginBottom: prog.interpolate({ inputRange: [0, 1], outputRange: [0, gap] }),
        transform: [{ translateX: prog.interpolate({ inputRange: [0, 1], outputRange: [70, 0] }) }],
      }
    : { marginBottom: gap };

  return (
    <Animated.View style={[{ overflow: 'hidden' }, style]}>
      <View onLayout={(e) => { if (!collapsing) height.current = e.nativeEvent.layout.height; }}>{children}</View>
    </Animated.View>
  );
}

/** Fades in under the list once every task of the day is done (and has finished animating out). */
export function AllDoneNote({ show }: { show: boolean }) {
  const op = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!show) { op.setValue(0); return; }
    Animated.timing(op, { toValue: 1, duration: 350, delay: HOLD_MS + COLLAPSE_MS, useNativeDriver: true }).start();
  }, [show]);
  if (!show) return null;
  return (
    <Animated.View style={{ opacity: op }} className="py-6 items-center">
      <Text className="text-4xl mb-2">🎉</Text>
      <Text className={T.h3}>All done for today</Text>
      <Text className={T.small + ' mt-1 text-center'}>Completed tasks are tucked away.</Text>
    </Animated.View>
  );
}
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Text, View } from 'react-native';
import { T } from '../ui';

const HOLD_MS = 450; // let the green tick show for a moment before the row leaves
const EXIT_MS = 260; // phase 1: the row fades and slides out to the right
const COLLAPSE_MS = 280; // phase 2: the gap it leaves closes so the rows below glide up
export const ROW_EXIT_TOTAL_MS = HOLD_MS + EXIT_MS + COLLAPSE_MS;

/**
 * Wraps one row of Today's Schedule (owner dashboard and collaborator dashboard).
 * Once `done` turns true the row keeps its tick for a beat, then slides/fades out (native driver, 60fps),
 * then its height collapses so the rows below glide up, and finally it is removed from the list.
 * Works the same when the task is completed from the other side (live sync flips `done` to true).
 * A row that is already completed when the list loads is simply not shown (no animation).
 * If `done` flips back (e.g. the request failed and the task was reverted) the row comes back.
 */
export default function CompletableRow({ done, children, gap = 8 }: { done: boolean; children: React.ReactNode; gap?: number }) {
  const [gone, setGone] = useState(done);
  const [leaving, setLeaving] = useState(false);
  const height = useRef(0);
  const exit = useRef(new Animated.Value(0)).current; // 0 = visible, 1 = slid out (native driver)
  const collapse = useRef(new Animated.Value(0)).current; // 0 = full height, 1 = collapsed (JS driver, height can't be native)
  const running = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (!done) {
      running.current?.stop();
      exit.setValue(0);
      collapse.setValue(0);
      setLeaving(false);
      setGone(false);
      return;
    }
    if (gone) return;
    const t = setTimeout(() => {
      setLeaving(true);
      const seq = Animated.sequence([
        Animated.timing(exit, { toValue: 1, duration: EXIT_MS, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
        Animated.timing(collapse, { toValue: 1, duration: COLLAPSE_MS, easing: Easing.inOut(Easing.cubic), useNativeDriver: false }),
      ]);
      running.current = seq;
      seq.start(({ finished }) => { if (finished) setGone(true); });
    }, HOLD_MS);
    return () => clearTimeout(t);
  }, [done]);

  useEffect(() => () => { running.current?.stop(); }, []);

  if (gone) return null;

  const h = height.current;
  const outerStyle = leaving && h > 0
    ? {
        height: collapse.interpolate({ inputRange: [0, 1], outputRange: [h, 0] }),
        marginBottom: collapse.interpolate({ inputRange: [0, 1], outputRange: [gap, 0] }),
      }
    : { marginBottom: gap };

  const innerStyle = {
    opacity: exit.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
    transform: [
      { translateX: exit.interpolate({ inputRange: [0, 1], outputRange: [0, 90] }) },
      { scale: exit.interpolate({ inputRange: [0, 1], outputRange: [1, 0.96] }) },
    ],
  };

  return (
    <Animated.View style={[{ overflow: 'hidden' }, outerStyle]}>
      <Animated.View style={innerStyle}>
        <View onLayout={(e) => { if (!leaving) height.current = e.nativeEvent.layout.height; }}>{children}</View>
      </Animated.View>
    </Animated.View>
  );
}

/** Fades in under the list once every task of the day is done (and has finished animating out). */
export function AllDoneNote({ show }: { show: boolean }) {
  const op = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!show) { op.setValue(0); return; }
    Animated.timing(op, { toValue: 1, duration: 350, delay: ROW_EXIT_TOTAL_MS, useNativeDriver: true }).start();
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
import { useMemo } from "react";
import { GestureResponderEvent, PanResponder, PanResponderGestureState } from "react-native";

const HORIZONTAL_THRESHOLD = 50;

/**
 * Left/right swipe to move between a screen's tabs — always on, everywhere
 * two or more tabs sit on one screen (Network's Feed/Connections/Messages,
 * Cases/Clients, a case's Overview/Financials). Built on the core
 * `PanResponder` (no extra native setup) rather than gesture-handler, and
 * only claims the gesture once a move is clearly more horizontal than
 * vertical, so it coexists with a vertically scrolling list/page underneath.
 *
 * Spread the returned `panHandlers` onto a plain View that wraps the tab
 * content (a sibling of — not the same component as — any ScrollView/
 * FlatList inside it, so that list keeps its own vertical scroll gestures).
 */
export function useSwipeTabs<K extends string>(keys: readonly K[], value: K, onChange: (key: K) => void) {
  return useMemo(() => {
    const responder = PanResponder.create({
      onMoveShouldSetPanResponder: (_evt: GestureResponderEvent, gesture: PanResponderGestureState) =>
        Math.abs(gesture.dx) > 12 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 2,
      onPanResponderRelease: (_evt: GestureResponderEvent, gesture: PanResponderGestureState) => {
        const index = keys.indexOf(value);
        if (gesture.dx <= -HORIZONTAL_THRESHOLD && index < keys.length - 1) onChange(keys[index + 1]);
        else if (gesture.dx >= HORIZONTAL_THRESHOLD && index > 0) onChange(keys[index - 1]);
      },
    });
    return responder.panHandlers;
  }, [keys, value, onChange]);
}

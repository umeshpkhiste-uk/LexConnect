import { useRef, useState } from "react";
import { GestureResponderEvent, StyleSheet, View } from "react-native";
import Svg, { Circle, Line, Polyline } from "react-native-svg";
import { useTheme } from "@/shared/ui/theme";

type Props = {
  /** Called with the dots (0–8) in the order they were drawn. */
  onComplete: (dots: number[]) => void;
  error?: boolean;
  size?: number;
};

/** 3×3 dot grid: drag across the dots to draw a pattern. */
export function PatternGrid({ onComplete, error, size = 270 }: Props) {
  const { colors } = useTheme();
  const [path, setPath] = useState<number[]>([]);
  const [finger, setFinger] = useState<{ x: number; y: number } | null>(null);
  // Mirrors `path` synchronously while a gesture is in progress.
  const pathRef = useRef<number[]>([]);

  const cell = size / 3;
  const center = (i: number) => ({ x: (i % 3) * cell + cell / 2, y: Math.floor(i / 3) * cell + cell / 2 });
  const hitRadius = cell * 0.32;

  const addDot = (i: number) => {
    const current = pathRef.current;
    const last = current[current.length - 1];
    let next = current;
    // Crossing straight over a dot (e.g. 0 → 2 passes 1) includes it, like
    // other pattern locks.
    if (last !== undefined) {
      const midRow = (Math.floor(last / 3) + Math.floor(i / 3)) / 2;
      const midCol = ((last % 3) + (i % 3)) / 2;
      const mid = midRow * 3 + midCol;
      if (Number.isInteger(midRow) && Number.isInteger(midCol) && !next.includes(mid)) next = [...next, mid];
    }
    pathRef.current = [...next, i];
    setPath(pathRef.current);
  };

  const track = (e: GestureResponderEvent) => {
    const { locationX: x, locationY: y } = e.nativeEvent;
    setFinger({ x, y });
    for (let i = 0; i < 9; i++) {
      const c = center(i);
      if (!pathRef.current.includes(i) && Math.hypot(c.x - x, c.y - y) < hitRadius) addDot(i);
    }
  };

  const start = (e: GestureResponderEvent) => {
    pathRef.current = [];
    setPath([]);
    track(e);
  };

  const end = () => {
    setFinger(null);
    const dots = pathRef.current;
    if (dots.length) onComplete(dots);
    // Leave the drawn path visible briefly, then clear for the next try.
    setTimeout(() => {
      pathRef.current = [];
      setPath([]);
    }, 450);
  };

  const stroke = error ? colors.danger : colors.brand;
  const points = path.map((i) => center(i));
  const last = points[points.length - 1];

  return (
    <View
      style={[styles.box, { width: size, height: size }]}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderTerminationRequest={() => false}
      onResponderGrant={start}
      onResponderMove={track}
      onResponderRelease={end}
      accessibilityLabel="Pattern grid, drag to connect dots"
    >
      <Svg width={size} height={size} pointerEvents="none">
        {points.length > 1 ? (
          <Polyline
            points={points.map((p) => `${p.x},${p.y}`).join(" ")}
            fill="none"
            stroke={stroke}
            strokeWidth={5}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ) : null}
        {last && finger ? (
          <Line x1={last.x} y1={last.y} x2={finger.x} y2={finger.y} stroke={stroke} strokeWidth={5} strokeOpacity={0.4} strokeLinecap="round" />
        ) : null}
        {Array.from({ length: 9 }, (_, i) => {
          const c = center(i);
          const active = path.includes(i);
          return <Circle key={i} cx={c.x} cy={c.y} r={active ? 14 : 9} fill={active ? stroke : colors.textSecondary} fillOpacity={active ? 1 : 0.5} />;
        })}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignSelf: "center" },
});

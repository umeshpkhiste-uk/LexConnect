import { PropsWithChildren } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Circle, G } from "react-native-svg";

type Segment = { value: number; color: string };

type Props = PropsWithChildren<{
  segments: Segment[];
  size?: number;
  strokeWidth?: number;
  trackColor: string;
}>;

/** Ring chart; children render in the centre. */
export function DonutChart({ segments, size = 180, strokeWidth = 18, trackColor, children }: Props) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = segments.reduce((sum, s) => sum + Math.max(0, s.value), 0);
  // A small gap between segments reads better than touching arcs.
  const gap = segments.filter((s) => s.value > 0).length > 1 ? 4 : 0;

  let offset = 0;
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <G rotation={-90} origin={`${size / 2}, ${size / 2}`}>
          <Circle cx={size / 2} cy={size / 2} r={radius} stroke={trackColor} strokeWidth={strokeWidth} fill="none" />
          {total > 0 &&
            segments.map((segment, i) => {
              if (segment.value <= 0) return null;
              const length = (segment.value / total) * circumference;
              const circle = (
                <Circle
                  key={i}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  stroke={segment.color}
                  strokeWidth={strokeWidth}
                  fill="none"
                  strokeLinecap="butt"
                  strokeDasharray={`${Math.max(0, length - gap)} ${circumference}`}
                  strokeDashoffset={-offset}
                />
              );
              offset += length;
              return circle;
            })}
        </G>
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.center]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: "center", justifyContent: "center" },
});

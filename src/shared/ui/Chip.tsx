import { Pressable } from "react-native";
import { Badge } from "./Badge";

type Props = {
  label: string;
  selected: boolean;
  onPress: () => void;
};

/** A tappable Badge. Never nest a Badge (a View) directly inside a <Text> —
 * React Native only allows text/Text children inside Text. */
export function Chip({ label, selected, onPress }: Props) {
  return (
    <Pressable onPress={onPress}>
      <Badge label={label} tone={selected ? "brand" : "neutral"} />
    </Pressable>
  );
}

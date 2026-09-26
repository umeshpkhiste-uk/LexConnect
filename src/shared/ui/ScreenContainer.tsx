import { HeaderShownContext } from "expo-router/react-navigation";
import { PropsWithChildren, useContext } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View, ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "./theme";

type Props = PropsWithChildren<{
  scroll?: boolean;
  style?: ViewStyle;
}>;

export function ScreenContainer({ children, scroll = false, style }: Props) {
  const { colors, spacing } = useTheme();
  // A navigation header already clears the status bar; adding the top inset
  // again would leave a blank band under it.
  const hasHeader = useContext(HeaderShownContext);

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: colors.background }]} edges={hasHeader ? ["bottom"] : ["top", "bottom"]}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        {scroll ? (
          <ScrollView
            contentContainerStyle={[styles.content, { padding: spacing.lg }, style]}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>
        ) : (
          <View style={[styles.content, { padding: spacing.lg }, style]}>{children}</View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { flexGrow: 1 },
});

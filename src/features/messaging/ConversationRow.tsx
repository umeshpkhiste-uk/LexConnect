import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Avatar, withAdvPrefix } from "@/features/network/NetworkCards";
import { useTheme } from "@/shared/ui/theme";
import { ConversationSummary } from "./api";
import { listTime, messagePreview } from "./chatFormat";

/** WhatsApp-style chat-list row: avatar with online dot, name, last message
 * (with your ticks), time, and a green unread badge. */
export function ConversationRow({ conversation, myId, onPress }: { conversation: ConversationSummary; myId: string | null; onPress: () => void }) {
  const { colors, spacing, radius, typography } = useTheme();
  const last = conversation.lastMessage;
  const unread = conversation.unreadCount;
  const isMine = !!last && last.sender_id === myId;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, opacity: pressed ? 0.85 : 1 }]}
      accessibilityLabel={`Chat with ${conversation.otherParty.full_name}${unread ? `, ${unread} unread` : ""}`}
    >
      <Avatar name={conversation.otherParty.full_name} photoUrl={conversation.otherParty.profile_photo_url} size={50} userId={conversation.otherParty.id} />
      <View style={{ flex: 1, gap: 2 }}>
        <View style={styles.line}>
          <Text style={[typography.bodyStrong, { flex: 1, color: colors.textPrimary }]} numberOfLines={1}>
            {withAdvPrefix(conversation.otherParty.full_name)}
          </Text>
          <Text style={[typography.caption, { fontSize: 12, color: unread ? colors.success : colors.textSecondary, fontWeight: unread ? "700" : "400" }]}>
            {listTime(last?.created_at ?? conversation.last_message_at)}
          </Text>
        </View>
        <View style={styles.line}>
          {isMine && last && !last.is_deleted ? (
            <Ionicons name={last.read_at ? "checkmark-done" : "checkmark"} size={16} color={last.read_at ? "#53BDEB" : colors.textSecondary} />
          ) : null}
          {last?.attachment_kind && !last.is_deleted ? (
            <Ionicons name={last.attachment_kind === "image" ? "camera" : "document-text"} size={14} color={colors.textSecondary} />
          ) : null}
          {last?.is_deleted ? <Ionicons name="ban-outline" size={14} color={colors.textSecondary} /> : null}
          <Text
            style={[
              typography.caption,
              {
                flex: 1,
                color: unread ? colors.textPrimary : colors.textSecondary,
                fontWeight: unread ? "600" : "400",
                fontStyle: last?.is_deleted ? "italic" : "normal",
              },
            ]}
            numberOfLines={1}
          >
            {last ? messagePreview(last) : "Tap to start chatting"}
          </Text>
          {unread ? (
            <View style={[styles.badge, { backgroundColor: colors.success }]}>
              <Text style={styles.badgeText}>{unread > 99 ? "99+" : unread}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  line: { flexDirection: "row", alignItems: "center", gap: 4 },
  badge: { minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 6, alignItems: "center", justifyContent: "center" },
  badgeText: { color: "#FFFFFF", fontSize: 11, fontWeight: "700" },
});

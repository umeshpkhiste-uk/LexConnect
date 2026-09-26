import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Image, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import {
  addComment,
  deletePost,
  FeedPost,
  getPublicImageUrl,
  isEdited,
  listComments,
  PostComment,
  updatePost,
} from "@/features/posts/api";
import { OnlineDot } from "@/features/presence/OnlineDot";
import { ActionSheet, SheetAction } from "@/shared/ui/ActionSheet";
import { PostVideo } from "@/features/posts/PostVideo";
import { useTheme } from "@/shared/ui/theme";
import type { PublicProfile } from "./api";

export function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? "s" : ""} ago`;
}

function initials(name: string) {
  return name
    .replace(/^adv\.?\s+/i, "")
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join("");
}

export function Avatar({
  name,
  photoUrl,
  size = 48,
  verified,
  userId,
}: {
  name: string;
  photoUrl?: string | null;
  size?: number;
  verified?: boolean;
  /** When set, a green dot shows while this advocate is online. */
  userId?: string | null;
}) {
  const { colors, typography } = useTheme();
  return (
    <View style={{ width: size, height: size }}>
      {photoUrl ? (
        <Image source={{ uri: photoUrl }} style={{ width: size, height: size, borderRadius: size / 2 }} />
      ) : (
        <View style={[styles.avatarFallback, { width: size, height: size, borderRadius: size / 2, backgroundColor: colors.surfaceAlt }]}>
          <Text style={[typography.bodyStrong, { color: colors.brand, fontSize: size * 0.34 }]}>{initials(name)}</Text>
        </View>
      )}
      {verified ? (
        <View style={[styles.verifiedBadge, { backgroundColor: colors.surface }]}>
          <Ionicons name="checkmark-circle" size={size * 0.3} color={colors.accent} />
        </View>
      ) : null}
      <OnlineDot userId={userId} avatarSize={size} />
    </View>
  );
}

/** Feed post styled as a professional note: gold accent rail, author
 * credentials row, body, and Endorse / Comment / Heart actions. Comments
 * open inline under the post rather than on a separate screen. */
export function PostCard({
  post,
  isOwn,
  onToggleEndorse,
  onToggleHeart,
  onCommentAdded,
  onEdited,
  onDeleted,
}: {
  post: FeedPost;
  /** The signed-in advocate wrote this post — enables Edit / Delete. */
  isOwn: boolean;
  onToggleEndorse: () => void;
  onToggleHeart: () => void;
  onCommentAdded: () => void;
  onEdited: (update: { content: string; updated_at: string }) => void;
  onDeleted: () => void;
}) {
  const { colors, spacing, radius, typography } = useTheme();
  const author = post.author;
  const name = author?.full_name ?? "Advocate";
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(post.content);
  const [isSaving, setIsSaving] = useState(false);

  const startEditing = () => {
    setDraft(post.content);
    setIsEditing(true);
  };

  const saveEdit = async () => {
    const text = draft.trim();
    if (!text || isSaving) return;
    if (text === post.content) {
      setIsEditing(false);
      return;
    }
    setIsSaving(true);
    try {
      onEdited(await updatePost(post.id, text));
      setIsEditing(false);
    } catch (err) {
      Alert.alert("Couldn't update post", err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = () =>
    Alert.alert("Delete this post?", "It will be removed from the feed for everyone, along with its comments and reactions. This can't be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deletePost(post);
            onDeleted();
          } catch (err) {
            Alert.alert("Couldn't delete post", err instanceof Error ? err.message : "Something went wrong");
          }
        },
      },
    ]);

  const menuActions: SheetAction[] = isOwn
    ? [
        { label: "Edit post", icon: "create-outline", onPress: startEditing },
        { label: "Delete post", icon: "trash-outline", onPress: confirmDelete },
      ]
    : [
        { label: "View author's profile", icon: "person-outline", onPress: () => router.push(`/(app)/network/${post.author_id}`) },
        {
          label: "Report post",
          icon: "flag-outline",
          onPress: () => router.push(`/(app)/reports/new?targetType=post&targetId=${post.id}&label=post`),
        },
      ];

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md }]}>
      <View style={[styles.accentRail, { backgroundColor: colors.accent }]} />

      <View style={styles.authorRow}>
        <Pressable
          onPress={() => router.push(`/(app)/network/${post.author_id}`)}
          style={[styles.authorRow, { flex: 1, gap: spacing.sm }]}
        >
          <Avatar name={name} photoUrl={author?.profile_photo_url} verified={author?.is_verified} userId={post.author_id} />
          <View style={{ flex: 1 }}>
            <View style={styles.nameRow}>
              <Text style={[typography.bodyStrong, { color: colors.brand, flexShrink: 1 }]} numberOfLines={1}>
                {withAdvPrefix(name)}
              </Text>
              {author?.is_verified ? <Ionicons name="shield-checkmark" size={13} color={colors.accent} /> : null}
            </View>
            {author?.headline ? (
              <Text style={[typography.caption, { color: colors.accent, fontWeight: "600" }]} numberOfLines={1}>
                {author.headline}
              </Text>
            ) : null}
            <Text style={[typography.caption, { color: colors.textSecondary }]} numberOfLines={1}>
              {timeAgo(post.created_at)}
              {author?.city ? ` • ${author.city}` : ""}
            </Text>
          </View>
        </Pressable>
        <Pressable onPress={() => setMenuOpen(true)} hitSlop={10} accessibilityLabel="Post options">
          <Ionicons name="ellipsis-horizontal" size={20} color={colors.textSecondary} />
        </Pressable>
      </View>

      {isEditing ? (
        <View style={[styles.editRow, { borderColor: colors.brand, borderRadius: radius.md, marginTop: spacing.sm, backgroundColor: colors.background }]}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            multiline
            autoFocus
            maxLength={3000}
            style={[typography.body, { flex: 1, color: colors.textPrimary, lineHeight: 22, paddingVertical: 8 }]}
          />
          <View style={styles.editButtons}>
            <Pressable onPress={() => setIsEditing(false)} hitSlop={8} accessibilityLabel="Cancel editing">
              <Ionicons name="close-circle-outline" size={26} color={colors.textSecondary} />
            </Pressable>
            <Pressable
              onPress={saveEdit}
              disabled={!draft.trim() || isSaving}
              hitSlop={8}
              accessibilityLabel="Post changes"
              style={[styles.postIcon, { backgroundColor: draft.trim() ? colors.brand : colors.border }]}
            >
              {isSaving ? <ActivityIndicator color={colors.textInverse} size="small" /> : <Ionicons name="send" size={16} color={colors.textInverse} />}
            </Pressable>
          </View>
        </View>
      ) : (
        <Text style={[typography.body, { color: colors.textPrimary, marginTop: spacing.sm, lineHeight: 22 }]}>{post.content}</Text>
      )}
      {!isEditing && isEdited(post) ? (
        <View style={[styles.editedTag, { marginTop: 4 }]}>
          <Ionicons name="pencil" size={12} color={colors.textSecondary} />
          <Text style={[typography.caption, { color: colors.textSecondary, fontStyle: "italic" }]}>Edited</Text>
        </View>
      ) : null}
      {post.image_path ? (
        <Image
          source={{ uri: getPublicImageUrl(post.image_path) }}
          style={{ width: "100%", height: 190, borderRadius: radius.sm, marginTop: spacing.sm }}
          resizeMode="cover"
        />
      ) : null}
      {post.video_path ? (
        <View style={{ marginTop: spacing.sm }}>
          <PostVideo path={post.video_path} height={210} borderRadius={radius.sm} />
        </View>
      ) : null}

      <View style={[styles.actions, { borderTopColor: colors.border, marginTop: spacing.md, paddingTop: spacing.xs }]}>
        <ActionButton
          icon={post.liked_by_me ? "thumbs-up" : "thumbs-up-outline"}
          label={post.liked_by_me ? "Endorsed" : "Endorse"}
          count={post.likes_count}
          activeColor={colors.accent}
          active={post.liked_by_me}
          onPress={onToggleEndorse}
        />
        <ActionButton
          icon={commentsOpen ? "chatbubble" : "chatbubble-outline"}
          label="Comment"
          count={post.comments_count}
          activeColor={colors.brand}
          active={commentsOpen}
          onPress={() => setCommentsOpen((open) => !open)}
        />
        <ActionButton
          icon={post.hearted_by_me ? "heart" : "heart-outline"}
          count={post.hearts_count}
          activeColor={colors.danger}
          active={post.hearted_by_me}
          onPress={onToggleHeart}
          accessibilityLabel={post.hearted_by_me ? "Remove heart" : "Heart"}
        />
      </View>

      {commentsOpen ? <InlineComments postId={post.id} onAdded={onCommentAdded} /> : null}

      <ActionSheet visible={menuOpen} title={isOwn ? "Your post" : name} actions={menuActions} onClose={() => setMenuOpen(false)} />
    </View>
  );
}

function ActionButton({
  icon,
  label,
  count,
  onPress,
  active,
  activeColor,
  accessibilityLabel,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label?: string;
  count: number;
  onPress: () => void;
  active?: boolean;
  activeColor: string;
  accessibilityLabel?: string;
}) {
  const { colors, radius, typography } = useTheme();
  const color = active ? activeColor : colors.textSecondary;
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ selected: !!active }}
      style={({ pressed }) => [
        styles.actionButton,
        { borderRadius: radius.sm, backgroundColor: pressed ? colors.surfaceAlt : "transparent" },
      ]}
    >
      <Ionicons name={icon} size={18} color={color} />
      {label ? <Text style={[typography.label, { color }]}>{label}</Text> : null}
      {count > 0 ? <Text style={[typography.label, { color: colors.textSecondary }]}>{count}</Text> : null}
    </Pressable>
  );
}

/** Comment thread + reply box, expanded in place under a post. */
function InlineComments({ postId, onAdded }: { postId: string; onAdded: () => void }) {
  const { colors, spacing, radius, typography } = useTheme();
  const [comments, setComments] = useState<PostComment[] | null>(null);
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    let isMounted = true;
    listComments(postId)
      .then((data) => isMounted && setComments(data))
      .catch(() => isMounted && setComments([]));
    return () => {
      isMounted = false;
    };
  }, [postId]);

  const send = async () => {
    const text = draft.trim();
    if (!text || isSending) return;
    setIsSending(true);
    try {
      await addComment(postId, text);
      setDraft("");
      setComments(await listComments(postId));
      onAdded();
    } catch (err) {
      Alert.alert("Couldn't post comment", err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <View style={[styles.comments, { borderTopColor: colors.border, marginTop: spacing.xs, paddingTop: spacing.sm, gap: spacing.sm }]}>
      {comments === null ? (
        <ActivityIndicator color={colors.brand} />
      ) : comments.length === 0 ? (
        <Text style={[typography.caption, { color: colors.textSecondary }]}>No comments yet. Start the discussion.</Text>
      ) : (
        comments.map((c) => {
          const commenter = c.author?.full_name ?? "Advocate";
          return (
            <View key={c.id} style={{ flexDirection: "row", gap: spacing.sm }}>
              <Avatar name={commenter} photoUrl={c.author?.profile_photo_url} size={30} userId={c.author_id} />
              <View style={[styles.commentBubble, { backgroundColor: colors.surfaceAlt, borderRadius: radius.md, padding: spacing.sm }]}>
                <Text style={[typography.label, { color: colors.brand }]}>
                  {withAdvPrefix(commenter)}
                  <Text style={[typography.caption, { color: colors.textSecondary, fontWeight: "400" }]}> · {timeAgo(c.created_at)}</Text>
                </Text>
                <Text style={[typography.body, { color: colors.textPrimary, marginTop: 2 }]}>{c.content}</Text>
              </View>
            </View>
          );
        })
      )}

      <View style={[styles.replyRow, { borderColor: colors.border, borderRadius: radius.pill, backgroundColor: colors.background }]}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="Write a comment…"
          placeholderTextColor={colors.textSecondary}
          style={[typography.body, { flex: 1, color: colors.textPrimary, paddingVertical: 8 }]}
          multiline
          onSubmitEditing={send}
        />
        <Pressable onPress={send} disabled={!draft.trim() || isSending} hitSlop={8} accessibilityLabel="Post comment">
          {isSending ? (
            <ActivityIndicator color={colors.brand} />
          ) : (
            <Ionicons name="send" size={20} color={draft.trim() ? colors.brand : colors.textSecondary} />
          )}
        </Pressable>
      </View>
    </View>
  );
}

export type ConnectStatus = "none" | "pending" | "accepted";

export function withAdvPrefix(name: string) {
  return /^adv\.?\s/i.test(name) ? name : `Adv. ${name}`;
}

/** Rounded-square portrait with a small credential badge in the corner. */
export function PortraitAvatar({
  name,
  photoUrl,
  size,
  verified,
  userId,
}: {
  name: string;
  photoUrl?: string | null;
  size: number;
  verified: boolean;
  userId?: string | null;
}) {
  const { colors, typography } = useTheme();
  const corner = size * 0.22;
  const badge = Math.round(size * 0.34);
  return (
    <View style={{ width: size, height: size }}>
      {photoUrl ? (
        <Image source={{ uri: photoUrl }} style={{ width: size, height: size, borderRadius: corner }} />
      ) : (
        <View style={[styles.avatarFallback, { width: size, height: size, borderRadius: corner, backgroundColor: colors.surfaceAlt }]}>
          <Text style={[typography.title, { color: colors.brand, fontSize: size * 0.32 }]}>{initials(name)}</Text>
        </View>
      )}
      <View
        style={[
          styles.portraitBadge,
          {
            width: badge,
            height: badge,
            borderRadius: badge / 2,
            right: -badge * 0.2,
            top: -badge * 0.2,
            backgroundColor: verified ? colors.surface : "#F3D9A4",
            borderColor: colors.surface,
          },
        ]}
      >
        <Ionicons
          name={verified ? "shield-checkmark" : "briefcase"}
          size={badge * 0.58}
          color={verified ? colors.brand : "#5D4201"}
        />
      </View>
      <OnlineDot userId={userId} avatarSize={size} inset={size * 0.04} />
    </View>
  );
}

/** Name, speciality, experience/forum and tags — shared by the colleague
 * card and the full advocate profile so both read the same way. */
export function AdvocateIdentity({ profile, large = false }: { profile: PublicProfile; large?: boolean }) {
  const { colors, spacing, radius, typography } = useTheme();
  const specialty = profile.practice_areas[0] ?? profile.headline;
  const experience = [profile.years_of_experience ? `${profile.years_of_experience} yrs exp` : null, profile.city]
    .filter(Boolean)
    .join(" • ");
  const forum = profile.courts[0];
  const tags = [...profile.practice_areas.slice(1), ...profile.courts.slice(1)].slice(0, large ? 6 : 2);

  return (
    <View style={{ alignItems: "center" }}>
      <PortraitAvatar
        name={profile.full_name}
        photoUrl={profile.profile_photo_url}
        size={large ? 112 : 76}
        verified={profile.is_verified}
        userId={profile.id}
      />
      <Text
        style={[
          large ? typography.title : typography.subtitle,
          { color: colors.textPrimary, marginTop: spacing.md, textAlign: "center" },
        ]}
        numberOfLines={large ? 2 : 1}
      >
        {withAdvPrefix(profile.full_name)}
      </Text>
      {specialty ? (
        <Text
          style={[typography.label, { color: colors.accent, textTransform: "uppercase", letterSpacing: 0.8, marginTop: 4, textAlign: "center" }]}
          numberOfLines={1}
        >
          {specialty}
        </Text>
      ) : null}
      {experience ? (
        <Text style={[typography.body, { color: colors.textSecondary, marginTop: 4, textAlign: "center" }]} numberOfLines={1}>
          {experience}
        </Text>
      ) : null}
      {forum ? (
        <Text style={[typography.body, { color: colors.textSecondary, textAlign: "center" }]} numberOfLines={1}>
          {forum}
        </Text>
      ) : null}
      {tags.length ? (
        <View style={[styles.tags, { marginTop: spacing.sm }]}>
          {tags.map((t) => (
            <View key={t} style={[styles.tag, { backgroundColor: colors.surfaceAlt, borderRadius: radius.sm }]}>
              <Text style={[typography.label, { color: colors.brand }]} numberOfLines={1}>
                {t}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

export function mutualLabel(count: number | undefined) {
  if (count === undefined) return null;
  return count === 0 ? "No mutual connections yet" : `${count} Mutual Connection${count === 1 ? "" : "s"}`;
}

/** Full-width dark "+ Connect" button (or its pending/connected state). */
export function ConnectButton({ status, onPress, label }: { status: ConnectStatus; onPress: () => void; label?: string }) {
  const { colors, radius, typography } = useTheme();
  const isPrimary = status === "none";
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.connectButton,
        {
          borderRadius: radius.sm,
          backgroundColor: isPrimary ? colors.textPrimary : colors.surfaceAlt,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <Ionicons
        name={status === "accepted" ? "people" : status === "pending" ? "time-outline" : "person-add-outline"}
        size={18}
        color={isPrimary ? colors.background : colors.textSecondary}
      />
      <Text style={[typography.bodyStrong, { color: isPrimary ? colors.background : colors.textSecondary }]}>
        {label ?? (status === "accepted" ? "Connected" : status === "pending" ? "Requested" : "+ Connect")}
      </Text>
    </Pressable>
  );
}

/** Colleague card for the Discover carousel / grid. */
export function ColleagueCard({
  profile,
  status,
  onConnect,
  mutualCount,
  width,
}: {
  profile: PublicProfile;
  status: ConnectStatus;
  onConnect: () => void;
  mutualCount?: number;
  width?: number;
}) {
  const { colors, spacing, radius, typography } = useTheme();
  const mutual = mutualLabel(mutualCount);

  return (
    <Pressable
      onPress={() => router.push(`/(app)/network/${profile.id}`)}
      style={[
        styles.card,
        styles.colleague,
        { width, backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, paddingTop: spacing.lg },
      ]}
    >
      <AdvocateIdentity profile={profile} />
      <View style={{ marginTop: spacing.md }}>
        {mutual ? (
          <Text style={[typography.label, { color: colors.textSecondary, textAlign: "center", marginBottom: spacing.sm }]}>{mutual}</Text>
        ) : null}
        <ConnectButton status={status} onPress={status === "none" ? onConnect : () => router.push(`/(app)/network/${profile.id}`)} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    shadowColor: "#0F172A",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
    overflow: "hidden",
  },
  accentRail: { position: "absolute", left: 0, top: 12, bottom: 12, width: 4, borderTopRightRadius: 4, borderBottomRightRadius: 4 },
  authorRow: { flexDirection: "row", alignItems: "flex-start" },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  avatarFallback: { alignItems: "center", justifyContent: "center" },
  verifiedBadge: {
    position: "absolute",
    right: -2,
    top: -2,
    borderRadius: 999,
    padding: 1,
  },
  actions: { flexDirection: "row", justifyContent: "space-between", borderTopWidth: StyleSheet.hairlineWidth },
  actionButton: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 8, paddingHorizontal: 10 },
  comments: { borderTopWidth: StyleSheet.hairlineWidth },
  editRow: { flexDirection: "row", alignItems: "flex-end", borderWidth: 1.5, paddingLeft: 12, paddingRight: 8, paddingVertical: 4, gap: 8 },
  editButtons: { flexDirection: "row", alignItems: "center", gap: 8, paddingBottom: 6 },
  postIcon: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  editedTag: { flexDirection: "row", alignItems: "center", gap: 4 },
  commentBubble: { flex: 1 },
  replyRow: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 14 },
  colleague: { justifyContent: "space-between" },
  tags: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 4 },
  tag: { paddingHorizontal: 10, paddingVertical: 4, maxWidth: 150 },
  connectButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, height: 46 },
  portraitBadge: { position: "absolute", alignItems: "center", justifyContent: "center", borderWidth: 2 },
});

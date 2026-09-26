import { Ionicons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system/legacy";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useVideoPlayer, VideoView } from "expo-video";
import { useState } from "react";
import { Alert, Image, Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { createPost, MAX_VIDEO_BYTES } from "@/features/posts/api";
import { Button } from "@/shared/ui/Button";
import { ScreenContainer } from "@/shared/ui/ScreenContainer";
import { TextField } from "@/shared/ui/TextField";
import { useTheme } from "@/shared/ui/theme";

export default function NewPostScreen() {
  const { colors, spacing, radius, typography } = useTheme();
  const [content, setContent] = useState("");
  const [image, setImage] = useState<{ uri: string; mimeType?: string } | null>(null);
  const [video, setVideo] = useState<{ uri: string; mimeType?: string; size?: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Gallery asks for photo access; camera asks for camera access.
  const pickImage = async (source: "library" | "camera") => {
    const permission =
      source === "camera" ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        source === "camera" ? "Camera access needed" : "Photo access needed",
        source === "camera"
          ? "Allow camera access in Settings to take a photo for your post."
          : "Allow photo library access in Settings to attach an image.",
        permission.canAskAgain ? [{ text: "OK" }] : [{ text: "Cancel", style: "cancel" }, { text: "Open Settings", onPress: () => Linking.openSettings() }],
      );
      return;
    }
    const options: ImagePicker.ImagePickerOptions = { mediaTypes: ["images"], quality: 0.7 };
    const result = source === "camera" ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
    const asset = result.canceled ? null : result.assets?.[0];
    if (asset) {
      setImage({ uri: asset.uri, mimeType: asset.mimeType });
      setVideo(null);
      setError(null);
    }
  };

  // A post carries one attachment: a photo or a video (under 50 MB).
  const pickVideo = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        "Photo access needed",
        "Allow photo library access in Settings to attach a video.",
        permission.canAskAgain ? [{ text: "OK" }] : [{ text: "Cancel", style: "cancel" }, { text: "Open Settings", onPress: () => Linking.openSettings() }],
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["videos"], videoQuality: ImagePicker.UIImagePickerControllerQualityType.Medium });
    const asset = result.canceled ? null : result.assets?.[0];
    if (!asset) return;
    let size = asset.fileSize;
    if (!size) {
      const info = await FileSystem.getInfoAsync(asset.uri);
      size = info.exists ? info.size : undefined;
    }
    if (size && size > MAX_VIDEO_BYTES) {
      Alert.alert("Video too large", `This video is ${(size / 1024 / 1024).toFixed(0)} MB. Please choose a video under 50 MB, or trim it first.`);
      return;
    }
    setVideo({ uri: asset.uri, mimeType: asset.mimeType ?? "video/mp4", size });
    setImage(null);
    setError(null);
  };

  const handlePost = async () => {
    if (!content.trim()) {
      setError("Write something to post");
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await createPost({ content, imageUri: image?.uri, imageMimeType: image?.mimeType, video });
      router.back();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScreenContainer scroll>
      <TextField
        label="Share a professional update"
        placeholder="What's on your mind?"
        value={content}
        onChangeText={setContent}
        multiline
        numberOfLines={6}
        style={{ height: 140, paddingTop: spacing.sm, textAlignVertical: "top" }}
      />

      {video ? (
        <View style={[styles.preview, { borderColor: colors.border, borderRadius: radius.lg, marginBottom: spacing.md }]}>
          <LocalVideoPreview uri={video.uri} />
          <View style={[styles.previewActions, { padding: spacing.sm, backgroundColor: colors.surface }]}>
            <Text style={[typography.caption, { color: colors.textSecondary, alignSelf: "center" }]}>
              {video.size ? `${(video.size / 1024 / 1024).toFixed(1)} MB` : "Video"}
            </Text>
            <Pressable onPress={pickVideo} style={styles.previewAction} accessibilityLabel="Choose another video">
              <Ionicons name="videocam-outline" size={18} color={colors.brand} />
              <Text style={[typography.label, { color: colors.brand }]}>Replace</Text>
            </Pressable>
            <Pressable onPress={() => setVideo(null)} style={styles.previewAction} accessibilityLabel="Remove video">
              <Ionicons name="trash-outline" size={18} color={colors.danger} />
              <Text style={[typography.label, { color: colors.danger }]}>Remove</Text>
            </Pressable>
          </View>
        </View>
      ) : image ? (
        <View style={[styles.preview, { borderColor: colors.border, borderRadius: radius.lg, marginBottom: spacing.md }]}>
          <Image source={{ uri: image.uri }} style={{ width: "100%", height: 200 }} resizeMode="cover" />
          <View style={[styles.previewActions, { padding: spacing.sm, backgroundColor: colors.surface }]}>
            <Pressable onPress={() => pickImage("camera")} style={styles.previewAction} accessibilityLabel="Retake photo">
              <Ionicons name="camera-outline" size={18} color={colors.brand} />
              <Text style={[typography.label, { color: colors.brand }]}>Retake</Text>
            </Pressable>
            <Pressable onPress={() => pickImage("library")} style={styles.previewAction} accessibilityLabel="Choose another image">
              <Ionicons name="images-outline" size={18} color={colors.brand} />
              <Text style={[typography.label, { color: colors.brand }]}>Replace</Text>
            </Pressable>
            <Pressable onPress={() => setImage(null)} style={styles.previewAction} accessibilityLabel="Remove image">
              <Ionicons name="trash-outline" size={18} color={colors.danger} />
              <Text style={[typography.label, { color: colors.danger }]}>Remove</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <View style={{ flexDirection: "row", gap: spacing.sm, marginBottom: spacing.md }}>
          {(
            [
              { source: "library", icon: "image-outline", label: "Upload image" },
              { source: "camera", icon: "camera-outline", label: "Take photo" },
              { source: "video", icon: "videocam-outline", label: "Upload video" },
            ] as const
          ).map((b) => (
            <Pressable
              key={b.source}
              onPress={() => (b.source === "video" ? pickVideo() : pickImage(b.source))}
              accessibilityLabel={b.label}
              style={({ pressed }) => [
                styles.pickButton,
                { borderColor: colors.border, borderRadius: radius.lg, backgroundColor: pressed ? colors.surfaceAlt : colors.surface },
              ]}
            >
              <Ionicons name={b.icon} size={24} color={colors.brand} />
              <Text style={[typography.label, { color: colors.textPrimary }]}>{b.label}</Text>
            </Pressable>
          ))}
        </View>
      )}

      {!image && !video ? (
        <Text style={[typography.caption, { color: colors.textSecondary, marginTop: -spacing.xs, marginBottom: spacing.md }]}>
          Add one photo or one video (up to 50 MB).
        </Text>
      ) : null}

      {error ? <Text style={{ color: colors.danger, marginBottom: spacing.md }}>{error}</Text> : null}

      <Button label={isSubmitting && video ? "Uploading video…" : "Post"} onPress={handlePost} loading={isSubmitting} pill />
    </ScreenContainer>
  );
}

/** Preview of the picked (not yet uploaded) video. */
function LocalVideoPreview({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = false;
  });
  return <VideoView player={player} nativeControls contentFit="contain" style={{ width: "100%", height: 200, backgroundColor: "#000000" }} />;
}

const styles = StyleSheet.create({
  pickButton: { flex: 1, alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 16, paddingHorizontal: 4, borderWidth: 1, borderStyle: "dashed" },
  preview: { overflow: "hidden", borderWidth: StyleSheet.hairlineWidth * 2 },
  previewActions: { flexDirection: "row", justifyContent: "space-around" },
  previewAction: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 4 },
});

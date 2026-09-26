import { useVideoPlayer, VideoView } from "expo-video";
import { StyleSheet } from "react-native";
import { getPublicVideoUrl } from "./api";

/** Inline video for a post, with the platform's own playback controls and
 * full-screen button. Nothing plays until the viewer taps play. */
export function PostVideo({ path, height = 220, borderRadius = 8 }: { path: string; height?: number; borderRadius?: number }) {
  const player = useVideoPlayer(getPublicVideoUrl(path), (p) => {
    p.loop = false;
  });

  return (
    <VideoView
      player={player}
      nativeControls
      contentFit="contain"
      fullscreenOptions={{ enable: true }}
      style={[styles.video, { height, borderRadius }]}
    />
  );
}

const styles = StyleSheet.create({
  video: { width: "100%", backgroundColor: "#000000", overflow: "hidden" },
});

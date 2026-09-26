import { decode } from "base64-arraybuffer";
import * as FileSystem from "expo-file-system/legacy";
import { supabase } from "@/shared/lib/supabase";

const BUCKET = "post-images";
const VIDEO_BUCKET = "post-videos";
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

export type FeedPost = {
  id: string;
  author_id: string;
  content: string;
  image_path: string | null;
  video_path: string | null;
  created_at: string;
  updated_at: string;
  author: {
    full_name: string;
    profile_photo_url: string | null;
    headline?: string | null;
    city?: string | null;
    is_verified?: boolean;
  } | null;
  /** Endorsements (the column predates hearts, hence the name). */
  likes_count: number;
  comments_count: number;
  liked_by_me: boolean;
  hearts_count: number;
  hearted_by_me: boolean;
};

export type ReactionKind = "endorse" | "heart";

async function currentUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error(error?.message ?? "Not signed in");
  return data.user.id;
}

export function getPublicImageUrl(path: string): string {
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

export function getPublicVideoUrl(path: string): string {
  return supabase.storage.from(VIDEO_BUCKET).getPublicUrl(path).data.publicUrl;
}

/** Streams a (large) file straight from disk to Storage, instead of loading
 * it into memory as base64 like small images. */
async function uploadFileFromDisk(bucket: string, path: string, uri: string, contentType: string) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Not signed in");
  const result = await FileSystem.uploadAsync(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/storage/v1/object/${bucket}/${path}`, uri, {
    httpMethod: "POST",
    uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "",
      "Content-Type": contentType,
      "x-upsert": "false",
    },
  });
  if (result.status < 200 || result.status >= 300) {
    const tooLarge = result.status === 413 || /too large|maximum allowed size/i.test(result.body);
    throw new Error(tooLarge ? "This video is larger than the upload limit (50 MB)." : `Upload failed (${result.status})`);
  }
}

export async function listFeed(): Promise<FeedPost[]> {
  const me = await currentUserId();

  const { data: posts, error } = await supabase
    .from("posts")
    .select("id, author_id, content, image_path, video_path, created_at, updated_at")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw new Error(error.message);
  if (!posts.length) return [];

  const postIds = posts.map((p) => p.id);
  const authorIds = [...new Set(posts.map((p) => p.author_id))];

  // Author display info, stats, and "did I like this" are each fetched
  // separately and merged client-side rather than embedded — see
  // features/network/api.ts for why: PostgREST embedding through the
  // posts.author_id FK would hit the private advocate_profiles table's
  // owner-only RLS and come back null for every author but me.
  const [authorsResult, statsResult, myReactionsResult] = await Promise.all([
    supabase
      .from("public_advocate_profiles")
      .select("id, full_name, profile_photo_url, headline, city, is_verified")
      .in("id", authorIds),
    supabase.from("post_stats").select("post_id, likes_count, comments_count, hearts_count").in("post_id", postIds),
    supabase.from("reactions").select("post_id, kind").eq("user_id", me).in("post_id", postIds),
  ]);
  if (authorsResult.error) throw new Error(authorsResult.error.message);
  if (statsResult.error) throw new Error(statsResult.error.message);
  if (myReactionsResult.error) throw new Error(myReactionsResult.error.message);

  const authorById = new Map(authorsResult.data.map((a) => [a.id, a]));
  const statsByPostId = new Map(statsResult.data.map((s) => [s.post_id, s]));
  const likedPostIds = new Set(myReactionsResult.data.filter((r) => r.kind === "endorse").map((r) => r.post_id));
  const heartedPostIds = new Set(myReactionsResult.data.filter((r) => r.kind === "heart").map((r) => r.post_id));

  return posts.map((p) => ({
    ...p,
    author: authorById.get(p.author_id) ?? null,
    likes_count: statsByPostId.get(p.id)?.likes_count ?? 0,
    comments_count: statsByPostId.get(p.id)?.comments_count ?? 0,
    liked_by_me: likedPostIds.has(p.id),
    hearts_count: statsByPostId.get(p.id)?.hearts_count ?? 0,
    hearted_by_me: heartedPostIds.has(p.id),
  }));
}

export async function getPost(postId: string): Promise<FeedPost | null> {
  const me = await currentUserId();

  const { data: post, error } = await supabase
    .from("posts")
    .select("id, author_id, content, image_path, video_path, created_at, updated_at")
    .eq("id", postId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!post) return null;

  const [authorResult, statsResult, myReactionResult] = await Promise.all([
    supabase.from("public_advocate_profiles").select("id, full_name, profile_photo_url").eq("id", post.author_id).maybeSingle(),
    supabase.from("post_stats").select("likes_count, comments_count, hearts_count").eq("post_id", postId).single(),
    supabase.from("reactions").select("kind").eq("user_id", me).eq("post_id", postId),
  ]);
  if (authorResult.error) throw new Error(authorResult.error.message);
  if (statsResult.error) throw new Error(statsResult.error.message);
  if (myReactionResult.error) throw new Error(myReactionResult.error.message);

  return {
    ...post,
    author: authorResult.data,
    likes_count: statsResult.data.likes_count,
    comments_count: statsResult.data.comments_count,
    liked_by_me: myReactionResult.data.some((r) => r.kind === "endorse"),
    hearts_count: statsResult.data.hearts_count,
    hearted_by_me: myReactionResult.data.some((r) => r.kind === "heart"),
  };
}

export async function createPost(input: {
  content: string;
  imageUri?: string;
  imageMimeType?: string;
  video?: { uri: string; mimeType?: string; size?: number } | null;
}): Promise<void> {
  const me = await currentUserId();

  let imagePath: string | null = null;
  if (input.imageUri) {
    const ext = input.imageMimeType?.split("/")[1] ?? "jpg";
    imagePath = `${me}/${Date.now()}.${ext}`;
    const base64 = await FileSystem.readAsStringAsync(input.imageUri, { encoding: "base64" });
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(imagePath, decode(base64), { contentType: input.imageMimeType ?? "image/jpeg" });
    if (uploadError) throw new Error(uploadError.message);
  }

  let videoPath: string | null = null;
  if (input.video) {
    if (input.video.size && input.video.size > MAX_VIDEO_BYTES) throw new Error("Videos must be smaller than 50 MB.");
    const mime = input.video.mimeType ?? "video/mp4";
    const ext = mime.split("/")[1]?.replace("quicktime", "mov") ?? "mp4";
    videoPath = `${me}/${Date.now()}.${ext}`;
    await uploadFileFromDisk(VIDEO_BUCKET, videoPath, input.video.uri, mime);
  }

  const { error } = await supabase.from("posts").insert({
    author_id: me,
    content: input.content.trim(),
    image_path: imagePath,
    video_path: videoPath,
  });
  if (error) {
    if (imagePath) await supabase.storage.from(BUCKET).remove([imagePath]);
    if (videoPath) await supabase.storage.from(VIDEO_BUCKET).remove([videoPath]);
    throw new Error(error.message);
  }
}

/** A post counts as edited when it changed after publishing (a small grace
 * window absorbs the insert-time trigger). */
export function isEdited(post: Pick<FeedPost, "created_at" | "updated_at">): boolean {
  return new Date(post.updated_at).getTime() - new Date(post.created_at).getTime() > 5000;
}

export async function updatePost(id: string, content: string): Promise<{ content: string; updated_at: string }> {
  const trimmed = content.trim();
  if (!trimmed) throw new Error("Post can't be empty");
  const { data, error } = await supabase
    .from("posts")
    .update({ content: trimmed })
    .eq("id", id)
    .select("content, updated_at")
    .single();
  if (error) throw new Error(error.message);
  return data;
}

/** Deletes a post and its image / video file. */
export async function deletePost(post: Pick<FeedPost, "id" | "image_path" | "video_path">): Promise<void> {
  const { error } = await supabase.from("posts").delete().eq("id", post.id);
  if (error) throw new Error(error.message);
  if (post.image_path) await supabase.storage.from(BUCKET).remove([post.image_path]);
  if (post.video_path) await supabase.storage.from(VIDEO_BUCKET).remove([post.video_path]);
}

export async function toggleReaction(postId: string, kind: ReactionKind, currentlyOn: boolean): Promise<void> {
  const me = await currentUserId();
  if (currentlyOn) {
    const { error } = await supabase.from("reactions").delete().eq("post_id", postId).eq("user_id", me).eq("kind", kind);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from("reactions").insert({ post_id: postId, user_id: me, kind });
    if (error) throw new Error(error.message);
  }
}

/** Endorse / un-endorse. */
export function toggleLike(postId: string, currentlyLiked: boolean): Promise<void> {
  return toggleReaction(postId, "endorse", currentlyLiked);
}

export type PostComment = {
  id: string;
  post_id: string;
  author_id: string;
  content: string;
  created_at: string;
  author: { full_name: string; profile_photo_url: string | null } | null;
};

export async function listComments(postId: string): Promise<PostComment[]> {
  const { data: comments, error } = await supabase
    .from("comments")
    .select("id, post_id, author_id, content, created_at")
    .eq("post_id", postId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  if (!comments.length) return [];

  const authorIds = [...new Set(comments.map((c) => c.author_id))];
  const { data: authors, error: authorsError } = await supabase
    .from("public_advocate_profiles")
    .select("id, full_name, profile_photo_url")
    .in("id", authorIds);
  if (authorsError) throw new Error(authorsError.message);

  const authorById = new Map(authors.map((a) => [a.id, a]));
  return comments.map((c) => ({ ...c, author: authorById.get(c.author_id) ?? null }));
}

export async function addComment(postId: string, content: string): Promise<void> {
  const me = await currentUserId();
  const { error } = await supabase.from("comments").insert({ post_id: postId, author_id: me, content: content.trim() });
  if (error) throw new Error(error.message);
}

export async function deleteComment(id: string): Promise<void> {
  const { error } = await supabase.from("comments").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

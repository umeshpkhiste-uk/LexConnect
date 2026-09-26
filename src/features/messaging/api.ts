import { decode } from "base64-arraybuffer";
import * as FileSystem from "expo-file-system/legacy";
import { supabase } from "@/shared/lib/supabase";

const ATTACHMENT_BUCKET = "message-attachments";

async function currentUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error(error?.message ?? "Not signed in");
  return data.user.id;
}

export type ConversationSummary = {
  id: string;
  last_message_at: string;
  otherParty: { id: string; full_name: string; profile_photo_url: string | null };
  lastMessage: {
    content: string;
    is_deleted: boolean;
    sender_id: string;
    read_at: string | null;
    created_at: string;
    attachment_kind: AttachmentKind | null;
  } | null;
  unreadCount: number;
};

export async function listConversations(): Promise<ConversationSummary[]> {
  const me = await currentUserId();

  const { data: rows, error } = await supabase
    .from("conversations")
    .select("id, participant_one_id, participant_two_id, last_message_at")
    .or(`participant_one_id.eq.${me},participant_two_id.eq.${me}`)
    .order("last_message_at", { ascending: false });
  if (error) throw new Error(error.message);
  if (!rows.length) return [];

  const otherIds = rows.map((r) => (r.participant_one_id === me ? r.participant_two_id : r.participant_one_id));
  const conversationIds = rows.map((r) => r.id);

  const [profilesResult, lastMessagesResult, unreadResult] = await Promise.all([
    supabase.from("public_advocate_profiles").select("id, full_name, profile_photo_url").in("id", otherIds),
    supabase
      .from("messages")
      .select("conversation_id, content, is_deleted, sender_id, read_at, created_at, attachment_kind")
      .in("conversation_id", conversationIds)
      .order("created_at", { ascending: false }),
    supabase
      .from("messages")
      .select("conversation_id")
      .in("conversation_id", conversationIds)
      .is("read_at", null)
      .neq("sender_id", me),
  ]);
  if (profilesResult.error) throw new Error(profilesResult.error.message);
  if (lastMessagesResult.error) throw new Error(lastMessagesResult.error.message);
  if (unreadResult.error) throw new Error(unreadResult.error.message);

  const profileById = new Map(profilesResult.data.map((p) => [p.id, p]));
  const lastMessageByConversation = new Map<string, (typeof lastMessagesResult.data)[number]>();
  for (const m of lastMessagesResult.data) {
    if (!lastMessageByConversation.has(m.conversation_id)) lastMessageByConversation.set(m.conversation_id, m);
  }
  const unreadCountByConversation = new Map<string, number>();
  for (const m of unreadResult.data) {
    unreadCountByConversation.set(m.conversation_id, (unreadCountByConversation.get(m.conversation_id) ?? 0) + 1);
  }

  return rows
    .map((r) => {
      const otherId = r.participant_one_id === me ? r.participant_two_id : r.participant_one_id;
      const otherParty = profileById.get(otherId);
      if (!otherParty) return null;
      const lastMessage = lastMessageByConversation.get(r.id) ?? null;
      return {
        id: r.id,
        last_message_at: r.last_message_at,
        otherParty,
        lastMessage: lastMessage
          ? {
              content: lastMessage.content,
              is_deleted: lastMessage.is_deleted,
              sender_id: lastMessage.sender_id,
              read_at: lastMessage.read_at,
              created_at: lastMessage.created_at,
              attachment_kind: lastMessage.attachment_kind as AttachmentKind | null,
            }
          : null,
        unreadCount: unreadCountByConversation.get(r.id) ?? 0,
      };
    })
    .filter((c): c is ConversationSummary => c !== null);
}

/** Finds or creates the 1-to-1 conversation with a connected advocate. */
export async function getOrCreateConversation(otherId: string): Promise<string> {
  const me = await currentUserId();

  const { data: existing, error: existingError } = await supabase
    .from("conversations")
    .select("id")
    .or(
      `and(participant_one_id.eq.${me},participant_two_id.eq.${otherId}),and(participant_one_id.eq.${otherId},participant_two_id.eq.${me})`
    )
    .maybeSingle();
  if (existingError) throw new Error(existingError.message);
  if (existing) return existing.id;

  const { data: created, error: createError } = await supabase
    .from("conversations")
    .insert({ participant_one_id: me, participant_two_id: otherId })
    .select("id")
    .single();
  if (createError) throw new Error(createError.message);
  return created.id;
}

export async function getConversationOtherParty(conversationId: string): Promise<string> {
  const me = await currentUserId();
  const { data, error } = await supabase
    .from("conversations")
    .select("participant_one_id, participant_two_id")
    .eq("id", conversationId)
    .single();
  if (error) throw new Error(error.message);
  return data.participant_one_id === me ? data.participant_two_id : data.participant_one_id;
}

export type AttachmentKind = "image" | "file";

export type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  is_deleted: boolean;
  read_at: string | null;
  created_at: string;
  edited_at: string | null;
  reply_to_id: string | null;
  attachment_path: string | null;
  attachment_kind: AttachmentKind | null;
  attachment_name: string | null;
  attachment_size: number | null;
  attachment_mime: string | null;
};

const MESSAGE_COLUMNS =
  "id, conversation_id, sender_id, content, is_deleted, read_at, created_at, edited_at, reply_to_id, attachment_path, attachment_kind, attachment_name, attachment_size, attachment_mime";

export async function listMessages(conversationId: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from("messages")
    .select(MESSAGE_COLUMNS)
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(500);
  if (error) throw new Error(error.message);
  return data as Message[];
}

export type Attachment = {
  uri: string;
  name: string;
  mimeType: string;
  size?: number;
  kind: AttachmentKind;
};

async function uploadAttachment(conversationId: string, file: Attachment): Promise<string> {
  const safeName = file.name.replace(/[^\w.\-]+/g, "_").slice(-80) || "file";
  // First folder = conversation id: that's what the storage policies check.
  const path = `${conversationId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName}`;
  const base64 = await FileSystem.readAsStringAsync(file.uri, { encoding: "base64" });
  const { error } = await supabase.storage.from(ATTACHMENT_BUCKET).upload(path, decode(base64), { contentType: file.mimeType });
  if (error) throw new Error(error.message);
  return path;
}

export async function sendMessage(
  conversationId: string,
  content: string,
  options: { replyToId?: string | null; attachment?: Attachment | null } = {}
): Promise<Message> {
  const me = await currentUserId();
  const attachment = options.attachment ?? null;
  const path = attachment ? await uploadAttachment(conversationId, attachment) : null;
  const { data, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      sender_id: me,
      content: content.trim(),
      reply_to_id: options.replyToId ?? null,
      attachment_path: path,
      attachment_kind: attachment?.kind ?? null,
      attachment_name: attachment?.name ?? null,
      attachment_size: attachment?.size ?? null,
      attachment_mime: attachment?.mimeType ?? null,
    })
    .select(MESSAGE_COLUMNS)
    .single();
  if (error) {
    if (path) await supabase.storage.from(ATTACHMENT_BUCKET).remove([path]);
    throw new Error(error.message);
  }
  return data as Message;
}

export async function editMessage(id: string, content: string): Promise<void> {
  const { error } = await supabase
    .from("messages")
    .update({ content: content.trim(), edited_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

const signedUrlCache = new Map<string, { url: string; expires: number }>();

/** Short-lived signed URL for a chat photo/file (the bucket is private). */
export async function getAttachmentUrl(path: string): Promise<string> {
  const cached = signedUrlCache.get(path);
  if (cached && cached.expires > Date.now()) return cached.url;
  const { data, error } = await supabase.storage.from(ATTACHMENT_BUCKET).createSignedUrl(path, 60 * 60);
  if (error) throw new Error(error.message);
  signedUrlCache.set(path, { url: data.signedUrl, expires: Date.now() + 50 * 60 * 1000 });
  return data.signedUrl;
}

/** Live updates for one chat: new/edited/read messages from Postgres, plus
 * the other person's typing state over a broadcast channel. */
export function subscribeToConversation(
  conversationId: string,
  handlers: { onUpsert: (message: Message) => void; onTyping: (userId: string, isTyping: boolean) => void }
) {
  const channel = supabase
    .channel(`chat:${conversationId}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
      (payload) => {
        if (payload.new && "id" in payload.new) handlers.onUpsert(payload.new as Message);
      }
    )
    .on("broadcast", { event: "typing" }, ({ payload }) => handlers.onTyping(payload.userId, payload.isTyping))
    .subscribe();

  return {
    sendTyping: (userId: string, isTyping: boolean) =>
      channel.send({ type: "broadcast", event: "typing", payload: { userId, isTyping } }),
    unsubscribe: () => {
      supabase.removeChannel(channel);
    },
  };
}

/** Fires whenever any message the user can see is added or changes, so the
 * chat list can refresh previews, ticks and unread counts live. */
export function subscribeToMyMessages(onChange: () => void) {
  const channel = supabase
    .channel(`chat-list:${Math.random().toString(36).slice(2)}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, onChange)
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}

export async function markConversationRead(conversationId: string): Promise<void> {
  const me = await currentUserId();
  const { error } = await supabase
    .from("messages")
    .update({ read_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .neq("sender_id", me)
    .is("read_at", null);
  if (error) throw new Error(error.message);
}

/** Delete for everyone: the bubble stays as "This message was deleted" and
 * any photo/file is removed from storage. */
export async function deleteMessage(message: Pick<Message, "id" | "attachment_path">): Promise<void> {
  const { error } = await supabase
    .from("messages")
    .update({
      is_deleted: true,
      content: "[deleted]",
      attachment_path: null,
      attachment_kind: null,
      attachment_name: null,
      attachment_size: null,
      attachment_mime: null,
    })
    .eq("id", message.id);
  if (error) throw new Error(error.message);
  if (message.attachment_path) await supabase.storage.from(ATTACHMENT_BUCKET).remove([message.attachment_path]);
}

export type ChatPartner = { id: string; full_name: string; profile_photo_url: string | null };

/** The other participant's public name and photo, for the chat header. */
export async function getChatPartner(conversationId: string): Promise<ChatPartner> {
  const otherId = await getConversationOtherParty(conversationId);
  const { data, error } = await supabase
    .from("public_advocate_profiles")
    .select("id, full_name, profile_photo_url")
    .eq("id", otherId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as ChatPartner | null) ?? { id: otherId, full_name: "Advocate", profile_photo_url: null };
}

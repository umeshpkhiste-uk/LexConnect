/**
 * Outbox for messages that haven't reached the server yet.
 *
 * This is a module-level singleton (like `activeChat.ts`), not React state,
 * so a pending or failed message survives navigating away from the chat
 * screen and back — the chat screen only ever subscribes to whatever is
 * already queued here. When the device's network comes back, every failed
 * or offline message across every conversation is retried automatically.
 */
import * as Network from "expo-network";
import { Attachment, Message, sendMessage } from "./api";
import type { ChatMessage } from "./ChatBubble";

type PendingListener = (messages: ChatMessage[]) => void;
type DeliveredListener = (message: Message) => void;

const pendingByConversation = new Map<string, ChatMessage[]>();
const fileByMessageId = new Map<string, Attachment | null>();
const pendingListeners = new Map<string, Set<PendingListener>>();
const deliveredListeners = new Map<string, Set<DeliveredListener>>();

let isConnected = true;
let knowsConnectivity = false;

function isStateConnected(state: Network.NetworkState): boolean {
  return state.isConnected !== false && state.isInternetReachable !== false;
}

Network.getNetworkStateAsync()
  .then((state) => {
    isConnected = isStateConnected(state);
    knowsConnectivity = true;
  })
  .catch(() => {
    // Unknown: stay optimistic so a first send is attempted rather than
    // parked as "offline" forever.
  });

Network.addNetworkStateListener((state) => {
  const nowConnected = isStateConnected(state);
  const cameBackOnline = knowsConnectivity && nowConnected && !isConnected;
  isConnected = nowConnected;
  knowsConnectivity = true;
  if (cameBackOnline) retryAllPending();
});

function snapshot(conversationId: string): ChatMessage[] {
  return pendingByConversation.get(conversationId) ?? [];
}

function notifyPending(conversationId: string) {
  const list = snapshot(conversationId);
  pendingListeners.get(conversationId)?.forEach((listener) => listener(list));
}

function setMessage(conversationId: string, updated: ChatMessage) {
  const list = snapshot(conversationId);
  const index = list.findIndex((m) => m.id === updated.id);
  const next = index === -1 ? [...list, updated] : list.map((m, i) => (i === index ? updated : m));
  pendingByConversation.set(conversationId, next);
  notifyPending(conversationId);
}

function removeMessage(conversationId: string, id: string) {
  const list = snapshot(conversationId);
  pendingByConversation.set(
    conversationId,
    list.filter((m) => m.id !== id)
  );
  fileByMessageId.delete(id);
  notifyPending(conversationId);
}

/** Called by the chat screen while it's mounted, to render this conversation's queue. */
export function subscribePending(conversationId: string, listener: PendingListener): () => void {
  let set = pendingListeners.get(conversationId);
  if (!set) {
    set = new Set();
    pendingListeners.set(conversationId, set);
  }
  set.add(listener);
  listener(snapshot(conversationId));
  return () => set!.delete(listener);
}

/** Called by the chat screen while it's mounted, to merge a just-delivered message straight into its list (no flicker while waiting on Realtime). */
export function subscribeDelivered(conversationId: string, listener: DeliveredListener): () => void {
  let set = deliveredListeners.get(conversationId);
  if (!set) {
    set = new Set();
    deliveredListeners.set(conversationId, set);
  }
  set.add(listener);
  return () => set!.delete(listener);
}

async function attemptDeliver(conversationId: string, temp: ChatMessage): Promise<void> {
  if (!isConnected) {
    setMessage(conversationId, { ...temp, localStatus: "offline" });
    return;
  }
  setMessage(conversationId, { ...temp, localStatus: "sending" });
  const file = fileByMessageId.get(temp.id) ?? null;
  try {
    const saved = await sendMessage(conversationId, temp.content, { replyToId: temp.reply_to_id, attachment: file });
    removeMessage(conversationId, temp.id);
    deliveredListeners.get(conversationId)?.forEach((listener) => listener(saved));
  } catch (err) {
    setMessage(conversationId, { ...temp, localStatus: "failed" });
    throw err;
  }
}

/** Queues a new outgoing message and makes the first delivery attempt. */
export function queueMessage(conversationId: string, temp: ChatMessage, file: Attachment | null): Promise<void> {
  fileByMessageId.set(temp.id, file);
  setMessage(conversationId, temp);
  return attemptDeliver(conversationId, temp);
}

/** Re-attempts a message already sitting in the outbox (user tapped retry, or the device reconnected). */
export function retryMessage(conversationId: string, id: string): Promise<void> | undefined {
  const existing = snapshot(conversationId).find((m) => m.id === id);
  if (!existing) return undefined;
  return attemptDeliver(conversationId, existing);
}

/** Drops a queued message the user chose not to send after all. */
export function discardMessage(conversationId: string, id: string) {
  removeMessage(conversationId, id);
}

function retryAllPending() {
  for (const [conversationId, list] of pendingByConversation.entries()) {
    for (const message of list) {
      if (message.localStatus === "failed" || message.localStatus === "offline") {
        attemptDeliver(conversationId, message).catch(() => {});
      }
    }
  }
}

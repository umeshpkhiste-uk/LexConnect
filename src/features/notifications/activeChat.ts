/** Which chat is open right now, so its own messages don't also pop up as
 * banners while you're reading them. */
let activeConversationId: string | null = null;

export function setActiveConversation(id: string | null) {
  activeConversationId = id;
}

export function getActiveConversation() {
  return activeConversationId;
}

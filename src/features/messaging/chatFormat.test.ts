import { buildChatItems, dayLabel, fileSizeLabel, messagePreview } from "./chatFormat";

const now = new Date(2026, 8, 25, 15, 0);

describe("dayLabel", () => {
  it("labels today and yesterday", () => {
    expect(dayLabel(new Date(2026, 8, 25, 9, 0).toISOString(), now)).toBe("Today");
    expect(dayLabel(new Date(2026, 8, 24, 23, 0).toISOString(), now)).toBe("Yesterday");
  });

  it("uses a full date for older messages", () => {
    expect(dayLabel(new Date(2026, 7, 1, 10, 0).toISOString(), now)).toMatch(/2026/);
  });
});

describe("buildChatItems", () => {
  it("returns newest first with a separator above each day", () => {
    const messages = [
      { id: "a", created_at: new Date(2026, 8, 24, 10, 0).toISOString() },
      { id: "b", created_at: new Date(2026, 8, 25, 9, 0).toISOString() },
      { id: "c", created_at: new Date(2026, 8, 25, 10, 0).toISOString() },
    ];
    const items = buildChatItems(messages, now);
    expect(items.map((i) => (i.type === "day" ? i.label : i.message.id))).toEqual(["c", "b", "Today", "a", "Yesterday"]);
  });

  it("handles an empty chat", () => {
    expect(buildChatItems([], now)).toEqual([]);
  });
});

describe("messagePreview", () => {
  it("describes deleted, photo and file messages", () => {
    expect(messagePreview({ content: "[deleted]", is_deleted: true, attachment_kind: null })).toBe("This message was deleted");
    expect(messagePreview({ content: "", is_deleted: false, attachment_kind: "image" })).toBe("Photo");
    expect(messagePreview({ content: "", is_deleted: false, attachment_kind: "file", attachment_name: "order.pdf" })).toBe("order.pdf");
    expect(messagePreview({ content: "Hi", is_deleted: false, attachment_kind: "image" })).toBe("Hi");
  });
});

describe("fileSizeLabel", () => {
  it("formats KB and MB", () => {
    expect(fileSizeLabel(2048)).toBe("2 KB");
    expect(fileSizeLabel(3 * 1024 * 1024)).toBe("3.0 MB");
    expect(fileSizeLabel(null)).toBeNull();
  });
});

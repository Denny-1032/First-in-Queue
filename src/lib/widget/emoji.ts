// Emoji palette for the widget composer.
//
// A hand-picked list rather than a picker library: the widget ships to every
// customer's page, so a 1 MB emoji dataset (or a CDN fetch, which the strictest
// customer CSPs would block) is not worth it. These are the ones people
// actually send to a support chat.

export interface EmojiGroup {
  label: string;
  emoji: string[];
}

export const EMOJI_GROUPS: EmojiGroup[] = [
  {
    label: "Smileys",
    emoji: [
      "😀", "😃", "😄", "😁", "😊", "🙂", "😉", "😍",
      "😘", "😗", "🤗", "🤔", "😐", "😑", "🙄", "😏",
      "😴", "😪", "😥", "😢", "😭", "😤", "😠", "😡",
      "😳", "😱", "😨", "😰", "😅", "😂", "🤣", "😜",
    ],
  },
  {
    label: "Gestures",
    emoji: [
      "👍", "👎", "👌", "🤝", "🙏", "👏", "🙌", "💪",
      "👋", "✌️", "🤞", "☝️", "👇", "👉", "👈", "✋",
    ],
  },
  {
    label: "Objects",
    emoji: [
      "❤️", "🔥", "⭐", "✅", "❌", "⚠️", "❓", "❗",
      "🎉", "🎁", "💰", "💳", "🛒", "📦", "📅", "⏰",
      "📞", "📧", "📍", "🏠", "🚗", "✈️", "☕", "🍕",
    ],
  },
];

/** Flat list, for tests and for keyboard navigation order. */
export const EMOJI_FLAT: string[] = EMOJI_GROUPS.flatMap((g) => g.emoji);

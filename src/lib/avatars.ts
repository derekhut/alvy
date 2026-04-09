import type { AvatarId } from "./types.js";

export const AVATARS: Record<AvatarId, { emoji: string; label: string }> = {
  scholar: { emoji: "🎓", label: "学者" },
  panda:   { emoji: "🐼", label: "熊猫" },
  rocket:  { emoji: "🚀", label: "火箭" },
  cat:     { emoji: "🐱", label: "小猫" },
  star:    { emoji: "🌟", label: "星星" },
  dragon:  { emoji: "🐉", label: "龙" },
  phoenix: { emoji: "🔥", label: "凤凰" },
  owl:     { emoji: "🦉", label: "猫头鹰" },
};

export const AVATAR_IDS: AvatarId[] = ["scholar", "panda", "rocket", "cat", "star", "dragon", "phoenix", "owl"];

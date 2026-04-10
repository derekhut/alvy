import type { AvatarId } from "./types.js";

export interface AvatarDef {
  art: string[];
  label: string;
}

export const AVATARS: Record<AvatarId, AvatarDef> = {
  duck:     { art: ["<(o )__", " ( ._> ", "  `---'"], label: "鸭子" },
  goose:    { art: ["-(•>   ", "-|  |) ", " /| |  "], label: "鹅" },
  blob:     { art: ["(• •) ", "/ > / ", "`---' "], label: "果冻" },
  cat:      { art: ["/\\_/\\ ", "( o.o )", " > ^ < "], label: "小猫" },
  dragon:   { art: [" /\\_/\\  ", "(-vvv-)", "`-----'"], label: "龙" },
  octopus:  { art: ["/° °\\", "( _ _ )", "/|/ \\|\\"], label: "章鱼" },
  owl:      { art: ["(( • ) ", "(( • ))", "( >< ) "], label: "猫头鹰" },
  penguin:  { art: ["( ·>· )", " /   \\ ", "`|   |`"], label: "企鹅" },
  turtle:   { art: ["[ ·  · ]", "[      ]", "`------'"], label: "乌龟" },
  snail:    { art: ["\\ ( @ ) ", " `'---'`", "        "], label: "蜗牛" },
  ghost:    { art: ["/ ·  · \\", "(       )", "`-------'"], label: "幽灵" },
  axolotl:  { art: [">(· ·)<", ">( _ )<", ">(~~~)<"], label: "六角龙" },
  robot:    { art: [".[  ].", "[•  •]", "[====]"], label: "机器人" },
  cactus:   { art: ["n   n", "|   |", "`---'"], label: "仙人掌" },
  rabbit:   { art: ["(\\_/)  ", "(\")_(\") ", " ` \" ` "], label: "兔子" },
  mushroom: { art: [".--o--.", "|  |  |", "`-----'"], label: "蘑菇" },
  bear:     { art: ["/(° °)\\", "( --- ) ", "`-----' "], label: "小熊" },
  alien:    { art: ["/|° °|\\", "( === ) ", "/|   |\\"], label: "外星人" },
};

export const AVATAR_IDS: AvatarId[] = [
  "duck", "goose", "blob", "cat", "dragon", "octopus",
  "owl", "penguin", "turtle", "snail", "ghost", "axolotl",
  "robot", "cactus", "rabbit", "mushroom", "bear", "alien",
];

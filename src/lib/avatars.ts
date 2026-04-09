import type { AvatarId } from "./types.js";

export interface AvatarDef {
  art: string[];
  label: string;
  inline: string;
}

export const AVATARS: Record<AvatarId, AvatarDef> = {
  duck:     { art: ["<(o )__", " ( ._> ", "  `---'"], label: "鸭子", inline: "<(o)~" },
  goose:    { art: ["-(•>   ", "-|  |) ", " /| |  "], label: "鹅", inline: "-(•>" },
  blob:     { art: ["(• •) ", "/ > / ", "`---' "], label: "果冻", inline: "(• •)" },
  cat:      { art: ["/\\_/\\ ", "( o.o )", " > ^ < "], label: "小猫", inline: "=^.^=" },
  dragon:   { art: [" /\\_/\\  ", "(-vvv-)", "`-----'"], label: "龙", inline: "~vvv~" },
  octopus:  { art: ["/° °\\", "( _ _ )", "/|/ \\|\\"], label: "章鱼", inline: "/°°\\" },
  owl:      { art: ["(( • ) ", "(( • ))", "( >< ) "], label: "猫头鹰", inline: "(•)" },
  penguin:  { art: ["( ·>· )", " /   \\ ", "`|   |`"], label: "企鹅", inline: "(·>·)" },
  turtle:   { art: ["[ ·  · ]", "[      ]", "`------'"], label: "乌龟", inline: "[··]" },
  snail:    { art: ["\\ ( @ ) ", " `'---'`", "        "], label: "蜗牛", inline: "@)" },
  ghost:    { art: ["/ ·  · \\", "(       )", "`-------'"], label: "幽灵", inline: "/··\\" },
  axolotl:  { art: [">(· ·)<", ">( _ )<", ">(~~~)<"], label: "六角龙", inline: ">(··)<" },
  robot:    { art: [".[  ].", "[•  •]", "[====]"], label: "机器人", inline: "[••]" },
  cactus:   { art: ["n   n", "|   |", "`---'"], label: "仙人掌", inline: "n|n" },
  rabbit:   { art: ["(\\_/)  ", "(\")_(\") ", " ` \" ` "], label: "兔子", inline: "(\\_/)" },
  mushroom: { art: [".--o--.", "|  |  |", "`-----'"], label: "蘑菇", inline: "-o-" },
  bear:     { art: ["/(° °)\\", "( --- ) ", "`-----' "], label: "小熊", inline: "(°°)" },
  alien:    { art: ["/|° °|\\", "( === ) ", "/|   |\\"], label: "外星人", inline: "|°°|" },
};

export const AVATAR_IDS: AvatarId[] = [
  "duck", "goose", "blob", "cat", "dragon", "octopus",
  "owl", "penguin", "turtle", "snail", "ghost", "axolotl",
  "robot", "cactus", "rabbit", "mushroom", "bear", "alien",
];

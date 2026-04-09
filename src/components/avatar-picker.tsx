import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import type { AvatarId } from "../lib/types.js";
import { AVATARS, AVATAR_IDS } from "../lib/avatars.js";

interface AvatarPickerProps {
  onSelect: (avatar: AvatarId) => void;
  onEsc?: () => void;
}

const COLS = 3;

export default function AvatarPicker({ onSelect, onEsc }: AvatarPickerProps) {
  const [cursor, setCursor] = useState(0);
  const rows = Math.ceil(AVATAR_IDS.length / COLS);

  useInput((_input, key) => {
    if (key.escape && onEsc) {
      onEsc();
      return;
    }
    if (key.return) {
      onSelect(AVATAR_IDS[cursor]!);
      return;
    }
    if (key.upArrow) {
      setCursor((prev) => (prev - COLS >= 0 ? prev - COLS : prev));
    } else if (key.downArrow) {
      setCursor((prev) => (prev + COLS < AVATAR_IDS.length ? prev + COLS : prev));
    } else if (key.leftArrow) {
      setCursor((prev) => (prev > 0 ? prev - 1 : prev));
    } else if (key.rightArrow) {
      setCursor((prev) => (prev < AVATAR_IDS.length - 1 ? prev + 1 : prev));
    }
  });

  const grid: AvatarId[][] = [];
  for (let r = 0; r < rows; r++) {
    grid.push(AVATAR_IDS.slice(r * COLS, r * COLS + COLS));
  }

  return (
    <Box flexDirection="column">
      <Text>选择你的形象:</Text>
      <Box flexDirection="column" marginTop={1}>
        {grid.map((row, rowIdx) => (
          <Box key={rowIdx} flexDirection="column">
            {/* ASCII art lines */}
            {[0, 1, 2].map((artLine) => (
              <Box key={artLine}>
                {row.map((id, colIdx) => {
                  const idx = rowIdx * COLS + colIdx;
                  const avatar = AVATARS[id];
                  const selected = idx === cursor;
                  return (
                    <Box key={id} width={20}>
                      <Text color={selected ? "#AF5FFF" : undefined}>
                        {artLine === 0 && selected ? "› " : "  "}
                        {avatar.art[artLine] ?? ""}
                      </Text>
                    </Box>
                  );
                })}
              </Box>
            ))}
            {/* Label line */}
            <Box>
              {row.map((id, colIdx) => {
                const idx = rowIdx * COLS + colIdx;
                const avatar = AVATARS[id];
                const selected = idx === cursor;
                return (
                  <Box key={id} width={20}>
                    <Text color={selected ? "#AF5FFF" : undefined} dimColor={!selected}>
                      {"  "}{avatar.label}
                    </Text>
                  </Box>
                );
              })}
            </Box>
            {/* Spacer between rows */}
            {rowIdx < grid.length - 1 && <Box height={1} />}
          </Box>
        ))}
      </Box>
      <Box marginTop={1}>
        <Text dimColor>方向键选择，回车确认</Text>
      </Box>
    </Box>
  );
}

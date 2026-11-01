"use client";
import React, { useEffect, useRef, useState, useMemo } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { BOARD_ROWS, BOARD_COLS, wrapText } from "@/lib/frame/boardText";

const FLAP_CHARS = " ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$()-+&=;:'\"%,./?°";

const BASE_COL_DELAY = 30;
const BASE_ROW_DELAY = 20;
const BASE_STEP_MS = 55;
const BASE_FLIP_S = 0.35;
const BASE_TOTAL_S =
  ((BOARD_COLS - 1) * BASE_COL_DELAY +
    (BOARD_ROWS - 1) * BASE_ROW_DELAY +
    8 * BASE_STEP_MS) /
  1000;

type AccentColor = { top: string; bottom: string; text: string };

// A single soft warm-sand tint that flickers by occasionally during the
// scramble — one cohesive accent close in value to the cream flaps, so it reads
// as a gentle shimmer rather than a mix of colours. Dark ink so it stays legible.
const ACCENT_COLORS: AccentColor[] = [
  { top: "bg-[#DAC29A]", bottom: "bg-[#cdb188]", text: "text-[#2A2622]" },
];

// How often a scrambling flap briefly takes the accent tint (lower = rarer).
const ACCENT_CHANCE = 0.1;

const CELL_TEXT_STYLE: React.CSSProperties = {
  fontSize: "clamp(6px, 2vw, 22px)",
  lineHeight: 1,
};

const FlapCell = React.memo(function FlapCell({
  target,
  delay,
  stepMs,
  flipDuration,
}: {
  target: string;
  delay: number;
  stepMs: number;
  flipDuration: number;
}) {
  const [current, setCurrent] = useState(" ");
  const [prev, setPrev] = useState(" ");
  const [flipId, setFlipId] = useState(0);
  const [accent, setAccent] = useState<AccentColor | null>(null);
  const [prevAccent, setPrevAccent] = useState<AccentColor | null>(null);

  const curRef = useRef(" ");
  const tgtRef = useRef<string | null>(null);
  const accentRef = useRef<AccentColor | null>(null);
  const startTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stepTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (startTimer.current) clearTimeout(startTimer.current);
    if (stepTimer.current) clearTimeout(stepTimer.current);
    startTimer.current = null;
    stepTimer.current = null;

    const normalized = FLAP_CHARS.includes(target.toUpperCase())
      ? target.toUpperCase()
      : " ";
    if (normalized === tgtRef.current) return;
    tgtRef.current = normalized;
    if (normalized === " " && curRef.current === " ") return;

    const scrambleCount =
      normalized === " "
        ? 8 + Math.floor(Math.random() * 8)
        : 25 + Math.floor(Math.random() * 15);

    const runStep = (i: number) => {
      const isLast = i === scrambleCount;
      const ch = isLast
        ? normalized
        : FLAP_CHARS[1 + Math.floor(Math.random() * (FLAP_CHARS.length - 1))];
      const newAccent = isLast
        ? null
        : Math.random() < ACCENT_CHANCE
          ? ACCENT_COLORS[Math.floor(Math.random() * ACCENT_COLORS.length)]
          : null;
      setPrev(curRef.current);
      setPrevAccent(accentRef.current);
      curRef.current = ch;
      accentRef.current = newAccent;
      setCurrent(ch);
      setAccent(newAccent);
      setFlipId((n) => n + 1);
      if (!isLast) {
        stepTimer.current = setTimeout(() => runStep(i + 1), stepMs);
      }
    };

    startTimer.current = setTimeout(() => runStep(1), delay);

    return () => {
      if (startTimer.current) clearTimeout(startTimer.current);
      if (stepTimer.current) clearTimeout(stepTimer.current);
      startTimer.current = null;
      stepTimer.current = null;
      tgtRef.current = null;
    };
  }, [target, delay, stepMs]);

  const show = current === " " ? " " : current;
  const showPrev = prev === " " ? " " : prev;

  const textCx =
    "absolute inset-x-0 flex select-none items-center justify-center font-mono font-bold tracking-wide";

  const topBg = accent?.top ?? "bg-[#E7DFD2]";
  const bottomBg = accent?.bottom ?? "bg-[#E1D8C9]";
  const textColor = accent?.text ?? "text-[#2A2622]";
  const flapTopBg = prevAccent?.top ?? "bg-[#EDE6DA]";
  const flapTextColor = prevAccent?.text ?? "text-[#2A2622]";
  const bottomDelay = flipDuration * 0.5;

  return (
    <div className="flex aspect-3/6 flex-col overflow-hidden rounded-[2px] border border-[#D7CCBB] md:rounded-[3px] md:border-2">
      <div className="relative flex-1 perspective-dramatic transform-3d">
        <div className="absolute inset-0 z-40 hidden flex-row items-center justify-center md:flex">
          <div className="h-1/2 w-px rounded-tr-sm rounded-br-sm bg-[#CFC4B2]" />
          <div className="flex h-px flex-1 bg-[#CFC4B2]" />
          <div className="h-1/2 w-px rounded-tl-sm rounded-bl-sm bg-[#CFC4B2]" />
        </div>
        <div
          className={cn(
            "absolute inset-x-0 top-0 h-[calc(50%-0.5px)] overflow-hidden rounded-t-[3px]",
            topBg,
          )}
        >
          <div className={cn(textCx, textColor, "top-0 h-[200%]")} style={CELL_TEXT_STYLE}>
            {show}
          </div>
        </div>
        <div
          className={cn(
            "absolute inset-x-0 bottom-0 h-[calc(50%-0.5px)] overflow-hidden rounded-b-[3px]",
            bottomBg,
          )}
        >
          <div className={cn(textCx, textColor, "bottom-0 h-[200%]")} style={CELL_TEXT_STYLE}>
            {show}
          </div>
          {flipId > 0 && (
            <motion.div
              key={`s${flipId}`}
              className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.8),transparent_60%)]"
              initial={{ opacity: 0.5 }}
              animate={{ opacity: 0 }}
              transition={{ duration: flipDuration * 1.3, ease: "easeOut" }}
            />
          )}
        </div>
        {flipId > 0 && (
          <motion.div
            key={flipId}
            className={cn(
              "absolute inset-x-0 top-0 z-10 h-[calc(50%-0.5px)] origin-bottom overflow-hidden rounded-t-[3px] backface-hidden transform-3d",
              flapTopBg,
            )}
            initial={{ rotateX: 0 }}
            animate={{ rotateX: -100 }}
            transition={{ duration: flipDuration, ease: [0.55, 0.055, 0.675, 0.19] }}
          >
            <div className={cn(textCx, flapTextColor, "top-0 h-[200%]")} style={CELL_TEXT_STYLE}>
              {showPrev}
            </div>
            <motion.div
              className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0),rgba(255,255,255,1))]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              transition={{ duration: flipDuration }}
            />
          </motion.div>
        )}
        {flipId > 0 && (
          <motion.div
            key={`b${flipId}`}
            className={cn(
              "absolute inset-x-0 bottom-0 z-10 h-[calc(50%-0.5px)] origin-top overflow-hidden rounded-b-[3px] backface-hidden transform-3d",
              bottomBg,
            )}
            initial={{ rotateX: 90 }}
            animate={{ rotateX: 0 }}
            transition={{ duration: flipDuration * 0.85, delay: bottomDelay, ease: [0.33, 1.55, 0.64, 1] }}
          >
            <div className={cn(textCx, textColor, "bottom-0 h-[200%]")} style={CELL_TEXT_STYLE}>
              {show}
            </div>
            <motion.div
              className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,rgba(255,255,255,0),rgba(255,255,255,0.6))]"
              initial={{ opacity: 0.4 }}
              animate={{ opacity: 0 }}
              transition={{ duration: flipDuration * 0.85, delay: bottomDelay }}
            />
          </motion.div>
        )}
        <div className="pointer-events-none absolute inset-x-0 top-1/2 z-20 h-px -translate-y-[0.5px] bg-[#B8AE9C]/55" />
      </div>
      <div className="h-2 w-full bg-[repeating-linear-gradient(to_bottom,currentColor_0,currentColor_1px,transparent_1px,transparent_0.15rem)] mask-t-from-50% text-[#9c9080] opacity-25 md:h-4 md:bg-[repeating-linear-gradient(to_bottom,currentColor_0,currentColor_1px,transparent_1px,transparent_0.2rem)] " />
    </div>
  );
});

type ParsedCell = { type: "char"; value: string } | { type: "color"; hex: string };

const COLOR_MAP: Record<string, string> = {
  "{R}": "#D32F2F",
  "{O}": "#F57C00",
  "{Y}": "#FBC02D",
  "{G}": "#43A047",
  "{B}": "#1E88E5",
  "{V}": "#8E24AA",
  "{W}": "#FAFAFA",
};

const ColorCell = React.memo(function ColorCell({ color }: { color: string }) {
  return (
    <div
      className="aspect-3/5 rounded-[3px] border-2 border-neutral-300 dark:border-black"
      style={{ backgroundColor: color }}
    />
  );
});

function parseRow(row: string): ParsedCell[] {
  const cells: ParsedCell[] = [];
  let i = 0;
  while (i < row.length) {
    if (row[i] === "{" && i + 2 < row.length && row[i + 2] === "}") {
      const code = row.substring(i, i + 3);
      if (COLOR_MAP[code]) {
        cells.push({ type: "color", hex: COLOR_MAP[code] });
        i += 3;
        continue;
      }
    }
    cells.push({ type: "char", value: row[i] });
    i++;
  }
  return cells;
}

export interface TextFlippingBoardProps {
  rows?: string[];
  text?: string;
  className?: string;
  duration?: number;
  /** board dimensions — defaults to the full 6×22 departure board */
  rowCount?: number;
  cols?: number;
}

export function TextFlippingBoard({
  rows,
  text,
  className,
  duration = BASE_TOTAL_S,
  rowCount = BOARD_ROWS,
  cols = BOARD_COLS,
}: TextFlippingBoardProps) {
  const scale = duration / BASE_TOTAL_S;
  const colDelay = BASE_COL_DELAY * scale;
  const rowDelay = BASE_ROW_DELAY * scale;
  const stepMs = BASE_STEP_MS * scale;
  const flipDur = Math.min(0.6, Math.max(0.15, BASE_FLIP_S * scale));

  const board = useMemo(() => {
    const grid: ParsedCell[][] = Array.from({ length: rowCount }, () =>
      Array.from({ length: cols }, () => ({ type: "char" as const, value: " " })),
    );
    if (text) {
      const lines = wrapText(text, cols).slice(0, rowCount);
      const startRow = Math.max(0, Math.floor((rowCount - lines.length) / 2));
      lines.forEach((line, i) => {
        const row = startRow + i;
        if (row >= rowCount) return;
        const parsed = parseRow(line);
        const startCol = Math.max(0, Math.floor((cols - parsed.length) / 2));
        parsed.forEach((cell, c) => {
          if (startCol + c < cols) grid[row][startCol + c] = cell;
        });
      });
    } else if (rows) {
      rows.forEach((row, r) => {
        if (r >= rowCount) return;
        const parsed = parseRow(row);
        parsed.forEach((cell, c) => {
          if (c < cols) grid[r][c] = cell;
        });
      });
    }
    return grid;
  }, [rows, text, rowCount, cols]);

  return (
    <div
      className={cn(
        "relative mx-auto w-full max-w-3xl rounded-xl bg-[#E3DACB] p-2 shadow-lg md:rounded-2xl md:p-4",
        className,
      )}
    >
      <div
        className="grid gap-px md:gap-[3px]"
        style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
      >
        {board.map((row, r) =>
          row.map((cell, c) =>
            cell.type === "color" ? (
              <ColorCell key={`${r}-${c}`} color={cell.hex} />
            ) : (
              <FlapCell
                key={`${r}-${c}`}
                target={cell.value}
                delay={c * colDelay + r * rowDelay}
                stepMs={stepMs}
                flipDuration={flipDur}
              />
            ),
          ),
        )}
      </div>
    </div>
  );
}

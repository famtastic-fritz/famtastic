import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { SceneData } from "./schema";

/**
 * Word-by-word "karaoke" captions — the signature look of high-retention
 * faceless videos. Each word springs in at its startMs; the currently
 * spoken word is highlighted in the accent color and slightly scaled.
 * Emphasized words (numbers, long/ALLCAPS tokens) stay accent-colored.
 */
export const Captions: React.FC<{
  words: SceneData["words"];
  accent: string;
  fontFamily: string;
}> = ({ words, accent, fontFamily }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const nowMs = (frame / fps) * 1000;

  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: "16%",
        padding: "0 8%",
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        alignContent: "center",
        gap: "0.28em",
        textAlign: "center",
        fontFamily,
        fontWeight: 800,
        fontSize: 64,
        lineHeight: 1.18,
        letterSpacing: "-0.01em",
      }}
    >
      {words.map((w, i) => {
        const appear = spring({
          frame: frame - (w.startMs / 1000) * fps,
          fps,
          config: { damping: 16, stiffness: 200, mass: 0.5 },
          from: 0,
          to: 1,
          durationInFrames: 8,
        });
        const spoken = nowMs >= w.startMs && nowMs < w.endMs;
        const past = nowMs >= w.endMs;
        const active = spoken || w.emphasis;

        const color = active ? accent : past ? "#ffffff" : "rgba(255,255,255,0.55)";
        const y = interpolate(appear, [0, 1], [26, 0]);
        const scale = spoken ? 1.08 : 1;

        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              color,
              opacity: appear,
              transform: `translateY(${y}px) scale(${scale})`,
              textShadow: "0 4px 24px rgba(0,0,0,0.55)",
            }}
          >
            {w.word}
          </span>
        );
      })}
    </div>
  );
};

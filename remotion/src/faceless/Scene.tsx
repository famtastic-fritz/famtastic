import React from "react";
import {
  AbsoluteFill,
  Audio,
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Captions } from "./Captions";
import type { SceneData } from "./schema";

/**
 * One scene: a moving background (Ken Burns push on an image, or an
 * animated gradient) + word-by-word captions + optional per-scene audio.
 * Fades in/out at its edges so cuts between scenes feel intentional.
 */
export const Scene: React.FC<{
  scene: SceneData;
  accent: string;
  fontFamily: string;
}> = ({ scene, accent, fontFamily }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const { background } = scene;

  // Edge fades.
  const fade = interpolate(
    frame,
    [0, 8, durationInFrames - 8, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  // Ken Burns: slow zoom + drift. Direction varies by seed so adjacent
  // scenes don't move identically.
  const seed = background.kenBurnsSeed || 0;
  const dir = seed % 2 === 0 ? 1 : -1;
  const zoom = interpolate(frame, [0, durationInFrames], [1.06, 1.18]);
  const driftX = interpolate(frame, [0, durationInFrames], [0, 22 * dir]);
  const driftY = interpolate(frame, [0, durationInFrames], [0, -14]);

  const [c0, c1] = background.gradient?.length
    ? background.gradient
    : ["#0f172a", "#1e3a8a"];

  return (
    <AbsoluteFill style={{ opacity: fade, backgroundColor: c0 }}>
      {/* Background layer */}
      <AbsoluteFill
        style={{
          transform: background.kenBurns
            ? `scale(${zoom}) translate(${driftX}px, ${driftY}px)`
            : undefined,
        }}
      >
        {background.type === "image" && background.image ? (
          <Img
            src={
              background.image.startsWith("http")
                ? background.image
                : staticFile(background.image)
            }
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <AbsoluteFill
            style={{
              background: `radial-gradient(120% 120% at 30% 0%, ${c1} 0%, ${c0} 70%)`,
            }}
          />
        )}
      </AbsoluteFill>

      {/* Legibility scrim so captions read on any background */}
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(to top, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.15) 45%, rgba(0,0,0,0.0) 75%)",
        }}
      />

      <Captions words={scene.words} accent={accent} fontFamily={fontFamily} />

      {scene.audioSrc ? (
        <Audio
          src={
            scene.audioSrc.startsWith("http")
              ? scene.audioSrc
              : staticFile(scene.audioSrc)
          }
        />
      ) : null}
    </AbsoluteFill>
  );
};

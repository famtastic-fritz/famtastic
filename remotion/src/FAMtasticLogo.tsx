/**
 * FAMtasticLogo — the canonical brand-mark composition.
 *
 * Story (per ~/famtastic/brand/FAMTASTIC-BRAND-MARK.md):
 *   The mark is a snapshot of the moment of transformation:
 *     ordinary "fantastic" -> [wand touch / burst] -> FAMtastic
 *
 * Animation beats (durationInFrames = 120 at 30fps = 4 seconds):
 *   00–18  burst explodes from a tiny point (the wand-touch moment)
 *   12–36  FAM letters drop in behind the burst impact, settle with a spring
 *   30–60  "tastic" types/wipes in to the right of the burst
 *   60–120 hold pose
 */

import React from "react";
import {
  AbsoluteFill,
  Img,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { z } from "zod";

export const famtasticLogoSchema = z.object({
  burstVariant: z.enum(["luminous", "dark"]),
  famVariant: z.enum(["motion", "original"]),
  backgroundColor: z.string(),
});

type Props = z.infer<typeof famtasticLogoSchema>;

const Burst: React.FC<{ src: string }> = ({ src }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const scale = spring({
    frame,
    fps,
    config: { damping: 12, stiffness: 110, mass: 0.7 },
    from: 0,
    to: 1,
  });

  const rotate = interpolate(frame, [0, 30, 120], [-25, 0, 4], {
    extrapolateRight: "clamp",
  });

  return (
    <Img
      src={src}
      style={{
        position: "absolute",
        left: "50%",
        top: "50%",
        transform: `translate(-50%, -50%) scale(${scale}) rotate(${rotate}deg)`,
        width: "44%",
        height: "auto",
      }}
    />
  );
};

const FAM: React.FC<{ src: string }> = ({ src }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // frame here is already offset by Sequence from={12}, so it starts at 0
  // when the FAM sequence begins.
  const dropIn = spring({
    frame,
    fps,
    config: { damping: 14, stiffness: 130, mass: 0.9 },
    from: 0,
    to: 1,
  });

  const yOffset = interpolate(dropIn, [0, 1], [-80, 0]);
  const opacity = interpolate(dropIn, [0, 0.4, 1], [0, 0.6, 1]);

  return (
    <Img
      src={src}
      style={{
        position: "absolute",
        left: "50%",
        top: "50%",
        transform: `translate(-50%, calc(-50% + ${yOffset}px)) scale(${0.85 + dropIn * 0.05})`,
        width: "30%",
        height: "auto",
        opacity,
        // small drop shadow so the FAM separates from the burst behind it
        filter: "drop-shadow(0 6px 18px rgba(0,0,0,0.18))",
      }}
    />
  );
};

const Tastic: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // frame here is already offset by Sequence from={30}.
  const reveal = spring({
    frame,
    fps,
    config: { damping: 18, stiffness: 90, mass: 0.7 },
    from: 0,
    to: 1,
  });

  const xOffset = interpolate(reveal, [0, 1], [-40, 0]);
  const opacity = interpolate(reveal, [0, 0.2, 1], [0, 0.4, 1]);

  return (
    <Img
      src={staticFile("brand/tastic.png")}
      style={{
        position: "absolute",
        // anchored just right of the burst's right edge, baseline-aligned with FAM
        left: "calc(50% + 14%)",
        top: "calc(50% + 1.5%)",
        transform: `translate(${xOffset}px, -50%)`,
        width: "13%",
        height: "auto",
        opacity,
      }}
    />
  );
};

export const FAMtasticLogo: React.FC<Props> = ({
  burstVariant,
  famVariant,
  backgroundColor,
}) => {
  const burstSrc = staticFile(
    burstVariant === "luminous" ? "brand/burst-luminous.png" : "brand/burst-dark.png",
  );
  const famSrc = staticFile(
    famVariant === "motion" ? "brand/fam-motion.png" : "brand/fam-original.png",
  );

  return (
    <AbsoluteFill style={{ backgroundColor }}>
      <Sequence>
        <Burst src={burstSrc} />
      </Sequence>
      <Sequence from={12}>
        <FAM src={famSrc} />
      </Sequence>
      <Sequence from={30}>
        <Tastic />
      </Sequence>
    </AbsoluteFill>
  );
};

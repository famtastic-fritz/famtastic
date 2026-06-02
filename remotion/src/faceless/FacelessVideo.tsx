import React from "react";
import {
  AbsoluteFill,
  Img,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Scene } from "./Scene";
import { facelessSchema, type FacelessProps } from "./schema";

export { facelessSchema };

/**
 * Dynamic metadata — the video's duration AND dimensions come from the
 * spec, not from hardcoded <Composition> props. This is what lets one
 * composition render a 12s vertical short and a 90s wide explainer from
 * the same code. Remotion calls this before rendering.
 */
export const calculateFacelessMetadata = ({
  props,
}: {
  props: FacelessProps;
}) => {
  const fps = props.meta.fps || 30;
  return {
    durationInFrames: Math.max(1, props.totalDurationInFrames || fps),
    fps,
    width: props.meta.width || 1080,
    height: props.meta.height || 1920,
  };
};

const ProgressBar: React.FC<{ accent: string }> = ({ accent }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const pct = interpolate(frame, [0, durationInFrames], [0, 100], {
    extrapolateRight: "clamp",
  });
  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        height: 8,
        width: `${pct}%`,
        background: accent,
        boxShadow: `0 0 18px ${accent}`,
      }}
    />
  );
};

// Small persistent brand chip — turns every generated video into a
// FAMtastic-branded asset (and a distribution hook).
const BrandChip: React.FC<{ fontFamily: string }> = ({ fontFamily }) => (
  <div
    style={{
      position: "absolute",
      top: "5.5%",
      left: "6%",
      display: "flex",
      alignItems: "center",
      gap: 12,
      opacity: 0.92,
    }}
  >
    <Img src={staticFile("brand/burst-luminous.png")} style={{ width: 56, height: 56 }} />
    <span
      style={{
        fontFamily,
        fontWeight: 800,
        fontSize: 30,
        color: "#fff",
        textShadow: "0 2px 10px rgba(0,0,0,0.6)",
      }}
    >
      FAMtastic
    </span>
  </div>
);

export const FacelessVideo: React.FC<FacelessProps> = (props) => {
  const { scenes, theme } = props;
  const accent = theme?.accent || "#34d399";
  const fontFamily = theme?.fontFamily || "Inter, system-ui, sans-serif";

  let cursor = 0;
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {scenes.map((scene) => {
        const from = cursor;
        cursor += scene.durationInFrames;
        return (
          <Sequence
            key={scene.id}
            from={from}
            durationInFrames={scene.durationInFrames}
            name={`${scene.kind}: ${scene.text.slice(0, 28)}`}
          >
            <Scene scene={scene} accent={accent} fontFamily={fontFamily} />
          </Sequence>
        );
      })}
      <ProgressBar accent={accent} />
      <BrandChip fontFamily={fontFamily} />
    </AbsoluteFill>
  );
};

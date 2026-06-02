import { Composition } from "remotion";
import { FAMtasticLogo, famtasticLogoSchema } from "./FAMtasticLogo";
import {
  FacelessVideo,
  facelessSchema,
  calculateFacelessMetadata,
} from "./faceless/FacelessVideo";
import type { FacelessProps } from "./faceless/schema";
import demoSpec from "./faceless/demo.spec.json";

// Each <Composition> is an entry in the Remotion studio sidebar.
// Brand-mark compositions live in this file; render via:
//   npx remotion render <id> out/<filename>.mp4

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* ---- Faceless video generator ----
          Dimensions + duration come from the spec via calculateMetadata,
          so this one composition renders vertical/square/wide at any
          length. Generate a spec with `node bin/faceless.mjs "<topic>"`,
          then render with --props=<spec.json>. */}
      <Composition
        id="FacelessVideo"
        component={FacelessVideo}
        schema={facelessSchema}
        defaultProps={demoSpec as unknown as FacelessProps}
        calculateMetadata={calculateFacelessMetadata}
        durationInFrames={900}
        fps={30}
        width={1080}
        height={1920}
      />

      {/* ---- Brand marks ---- */}
      <Composition
        id="FAMtasticLogo-Luminous"
        component={FAMtasticLogo}
        durationInFrames={120}
        fps={30}
        width={1920}
        height={1080}
        schema={famtasticLogoSchema}
        defaultProps={{
          burstVariant: "luminous" as const,
          famVariant: "motion" as const,
          backgroundColor: "#ffffff",
        }}
      />

      <Composition
        id="FAMtasticLogo-Dark"
        component={FAMtasticLogo}
        durationInFrames={120}
        fps={30}
        width={1920}
        height={1080}
        schema={famtasticLogoSchema}
        defaultProps={{
          burstVariant: "dark" as const,
          famVariant: "motion" as const,
          backgroundColor: "#ffffff",
        }}
      />

      {/* Square format for social/avatars */}
      <Composition
        id="FAMtasticLogo-Square"
        component={FAMtasticLogo}
        durationInFrames={120}
        fps={30}
        width={1080}
        height={1080}
        schema={famtasticLogoSchema}
        defaultProps={{
          burstVariant: "luminous" as const,
          famVariant: "motion" as const,
          backgroundColor: "#ffffff",
        }}
      />
    </>
  );
};

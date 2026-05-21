import { Composition } from "remotion";
import { FAMtasticLogo, famtasticLogoSchema } from "./FAMtasticLogo";

// Each <Composition> is an entry in the Remotion studio sidebar.
// Brand-mark compositions live in this file; render via:
//   npx remotion render <id> out/<filename>.mp4

export const RemotionRoot: React.FC = () => {
  return (
    <>
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

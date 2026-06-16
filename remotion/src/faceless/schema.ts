import { z } from "zod";

// Mirrors the spec produced by src/pipeline/core.mjs -> buildSpec().
// This is the contract between the Node pipeline and the React renderer.

export const wordSchema = z.object({
  word: z.string(),
  startMs: z.number(),
  endMs: z.number(),
  emphasis: z.boolean().default(false),
});

export const backgroundSchema = z.object({
  type: z.enum(["gradient", "image", "video"]).default("gradient"),
  gradient: z.array(z.string()).default(["#0f172a", "#1e3a8a"]),
  image: z.string().nullable().default(null),
  kenBurns: z.boolean().default(true),
  kenBurnsSeed: z.number().default(0),
});

export const sceneSchema = z.object({
  id: z.string(),
  text: z.string(),
  kind: z.string().default("body"),
  words: z.array(wordSchema),
  durationInFrames: z.number(),
  durationMs: z.number().optional(),
  background: backgroundSchema,
  audioSrc: z.string().nullable().default(null),
});

export const facelessSchema = z.object({
  meta: z.object({
    title: z.string(),
    topic: z.string().optional(),
    slug: z.string().optional(),
    format: z.string().optional(),
    fps: z.number().optional(),
    width: z.number().optional(),
    height: z.number().optional(),
    sceneCount: z.number().optional(),
    estimatedSeconds: z.number().optional(),
    createdAt: z.string().optional(),
  }),
  theme: z
    .object({
      accent: z.string().default("#34d399"),
      fontFamily: z.string().default("Inter"),
    })
    .default({ accent: "#34d399", fontFamily: "Inter" }),
  scenes: z.array(sceneSchema),
  totalDurationInFrames: z.number(),
  voice: z
    .object({
      provider: z.string().default("none"),
      voice: z.string().nullable().default(null),
      hasAudio: z.boolean().default(false),
    })
    .optional(),
});

export type FacelessProps = z.infer<typeof facelessSchema>;
export type SceneData = z.infer<typeof sceneSchema>;

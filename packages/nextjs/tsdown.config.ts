import { defineConfig, type UserConfig } from "tsdown";

// Spec 0005 BLD-1 to BLD-3: ESM only, one output file per source module, no Node built ins, declarations from
// isolatedDeclarations, publint and are-the-types-wrong on every build. The exports map is written by hand (NPM-2).
// The two SDKs, server-only, and client-only stay imports, never bundled in (SDK-4).
const config: UserConfig = defineConfig({
  entry: ["src/index.ts", "src/server.ts", "src/client.ts"],
  format: "esm",
  unbundle: true,
  platform: "neutral",
  target: "es2022",
  dts: true,
  sourcemap: true,
  minify: false,
  fixedExtension: false,
  exports: false,
  publint: { level: "error" },
  attw: { profile: "esm-only", level: "error" },
});

export default config;

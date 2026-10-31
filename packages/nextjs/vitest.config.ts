import { fileURLToPath } from "node:url";
import { defineConfig, type ViteUserConfig } from "vitest/config";

// Spec 0014 CNF-6: the servers api/conformance/compose.yaml starts. Override them to point somewhere else.
const servers = {
  stubUrl: process.env.ORVANO_STUB_URL ?? "http://localhost:18081",
  liveUrl: process.env.ORVANO_LIVE_URL ?? "http://localhost:18080",
  partial: process.env.ORVANO_CONFORMANCE_PARTIAL === "1",
};
const empty = fileURLToPath(new URL("test/support/empty.ts", import.meta.url));

// Spec 0005 SQA-1, spec 0014 CNF-5: unit tests in Node, and the conformance suite through each entry in Node.
const config: ViteUserConfig = defineConfig({
  resolve: { alias: { "server-only": empty, "client-only": empty } },
  test: {
    projects: [
      {
        extends: true,
        test: { name: "unit", include: ["test/**/*.test.ts"], environment: "node" },
      },
      {
        extends: true,
        test: {
          name: "conformance-server",
          include: ["conformance/server.test.ts"],
          globalSetup: ["conformance/bootstrap.ts"],
          provide: { conformance: servers },
        },
      },
      {
        extends: true,
        test: {
          name: "conformance-client",
          include: ["conformance/client.test.ts"],
          globalSetup: ["conformance/bootstrap.ts"],
          provide: { conformance: servers },
        },
      },
    ],
  },
});

export default config;

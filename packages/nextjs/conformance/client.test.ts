// Spec 0014 AC-18, CNF-5: every @orvano/client scenario through @orvano/nextjs/client, in Node. The servers come from
// api/conformance/compose.yaml at the pinned orvano commit (see README.md).
import { afterAll, describe, expect, inject, it } from "vitest";
import { apiVersion, createBrowserClient, sdkVersion } from "../src/client.js";
import { dispatch, match, substitute } from "./client/dispatch.generated.js";
import generated from "./client/scenarios.generated.json" with { type: "json" };
import { notRun, runScenario, type Kit, type Scenario, type Servers } from "./runner.js";
import skips from "./skip.json" with { type: "json" };

declare module "vitest" {
  export interface ProvidedContext {
    conformance: { stubUrl: string; liveUrl: string; partial: boolean };
  }
}

const config = inject("conformance");
const scenarios = (generated as { scenarios: Scenario[] }).scenarios;
const skipList = skips as { id: string; reason: string; issue: string }[];
const servers: Servers = {
  stubUrl: config.stubUrl,
  liveUrl: config.liveUrl,
  project: inject("project"),
  fetch: (request) => globalThis.fetch(request),
};
// The identity @orvano/client sends today; NPM-6's nextjs identity needs an internal option in that package first.
const kit: Kit<ReturnType<typeof createBrowserClient>, Parameters<typeof dispatch>[3]> = {
  clientName: `client/${sdkVersion}`,
  projectKey: "publishableKey",
  open: (options) => createBrowserClient(options),
  dispatch,
  match,
  substitute,
  apiVersion,
};
const ran = new Set<string>();

describe("0014 AC-18: @orvano/nextjs/client conformance in Node", () => {
  for (const scenario of scenarios) {
    const skipped = skipList.some((skip) => skip.id === scenario.id);
    it.skipIf(skipped)(`${scenario.id}: ${scenario.title}`, async () => {
      ran.add(scenario.id);
      expect(await runScenario(scenario, servers, kit)).toEqual([]);
    });
  }

  // CNF-8. Set ORVANO_CONFORMANCE_PARTIAL=1 when you run a few scenarios with -t; CI never sets it.
  afterAll(() => {
    if (config.partial) return;
    const problems = notRun(scenarios, ran, skipList);
    if (problems.length > 0) throw new Error(`0014 CNF-8: ${problems.join(" ")}`);
  });
});

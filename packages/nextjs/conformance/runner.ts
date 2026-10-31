// Spec 0014 CNF-4, CNF-5, CNF-8: the hand written runner around the dispatchers `pnpm regenerate` copies from the
// pinned sdk-js and sdk-js-server commits. It opens the client through this package's factory for that entry, loads a
// stub scenario's script, runs each step, and matches results, errors, the last response, and what the SDK sent.

/** A scenario as the generator writes it into scenarios.generated.json (CNF-2). */
export interface Scenario {
  readonly id: string;
  readonly title: string;
  readonly mode: "live" | "stub";
  readonly requires: readonly string[];
  readonly client?: { readonly key?: string };
  readonly steps: readonly {
    readonly call: string;
    readonly params?: Record<string, unknown>;
    readonly options?: Record<string, unknown>;
    readonly expect: Record<string, unknown>;
  }[];
  readonly stub?: unknown;
  readonly expectRequests?: unknown;
}

/** The project and keys `orvano admin bootstrap-project` printed (spec 0017 SDK-4). */
export interface BootstrappedProject {
  readonly projectId: string;
  readonly publishableKey: string;
  readonly secretKey: string;
}

/** Where the servers are, and the fetch the suite itself uses. */
export interface Servers {
  readonly stubUrl: string;
  readonly liveUrl: string;
  /** Set when the run list holds a scenario that requires a project (spec 0014 CNF-7). */
  readonly project?: BootstrappedProject | undefined;
  readonly fetch: (request: Request) => Promise<Response>;
}

/** One entry of this package: its factory, its dispatcher, and the identity its requests carry. */
export interface Kit<Client, Options> {
  readonly clientName: string;
  /** The key this entry's audience opens with on a real project (spec 0017 SDK-4). */
  readonly projectKey: "publishableKey" | "secretKey";
  readonly open: (options: {
    url: string;
    project: string;
    key: string;
    fetch: (request: Request) => Promise<Response>;
  }) => Client;
  readonly dispatch: (
    client: Client,
    call: string,
    params: Readonly<Record<string, unknown>>,
    options: Options,
  ) => Promise<{ ok: true; result: unknown } | { ok: false; error: unknown }>;
  readonly match: (expected: unknown, actual: unknown, path?: string) => string[];
  readonly substitute: (value: unknown, variables: Readonly<Record<string, string>>) => unknown;
  readonly apiVersion: string;
}

const projectId = "0192f0c1-0000-7000-8000-000000000001";
const defaultKey = "conformance-key";

interface SeenResponse {
  status: number;
  headers: Record<string, string>;
  body: unknown;
}

/** Runs one scenario and returns every mismatch; an empty list is a pass. */
export async function runScenario<Client, Options>(
  scenario: Scenario,
  servers: Servers,
  kit: Kit<Client, Options>,
): Promise<string[]> {
  const { apiVersion, dispatch, match, substitute } = kit;
  const token = `run-${randomToken()}`;
  const real = scenario.requires.includes("project") ? servers.project : undefined;
  if (scenario.requires.includes("project") && real === undefined)
    return ["the scenario requires a project, and the run has none"];
  const key = scenario.client?.key ?? real?.[kit.projectKey] ?? defaultKey;
  const project = real?.projectId ?? projectId;
  const variables = { apiVersion, clientName: kit.clientName, key, projectId: project };
  const stub = scenario.mode === "stub";
  if (stub) {
    const loaded = await servers.fetch(
      new Request(`${servers.stubUrl}/__stub/runs/${token}/scenarios/${scenario.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stub: substitute(scenario.stub, variables) }),
      }),
    );
    if (loaded.status !== 204) return [`the stub refused the scenario (${String(loaded.status)})`];
  }

  // The suite's own fetch keeps the last response, for `expect.response`.
  let last: SeenResponse | undefined;
  const capture = async (request: Request): Promise<Response> => {
    const response = await servers.fetch(request);
    const text = await response.clone().text();
    const headers: Record<string, string> = {};
    response.headers.forEach((value, name) => {
      headers[name] = value;
    });
    last = { status: response.status, headers, body: parse(text) };
    return response;
  };
  const client = kit.open({
    url: stub ? servers.stubUrl : servers.liveUrl,
    project,
    key,
    fetch: capture,
  });

  const problems: string[] = [];
  for (const [index, step] of scenario.steps.entries()) {
    const where = `step ${String(index + 1)}`;
    const options = substitute(step.options ?? {}, variables) as Options & {
      headers?: Record<string, string>;
    };
    const headers: Record<string, string> = { ...options.headers };
    if (stub) headers["Orvano-Stub-Run"] = token;
    // Steps run in order; each may depend on the one before.
    // oxlint-disable-next-line no-await-in-loop -- a scenario's steps run one after another
    const outcome = await dispatch(
      client,
      step.call,
      substitute(step.params ?? {}, variables) as Record<string, unknown>,
      {
        ...options,
        headers,
      },
    );
    const expected = substitute(step.expect, variables) as Record<string, unknown>;
    if ("result" in expected) {
      problems.push(
        ...(outcome.ok
          ? match(expected["result"], outcome.result, `${where} result`)
          : [`${where}: failed with ${JSON.stringify(outcome.error)}`]),
      );
    } else {
      problems.push(
        ...(outcome.ok
          ? [`${where}: succeeded, expected an error`]
          : match(expected["error"], outcome.error, `${where} error`)),
      );
    }
    if (expected["response"] !== undefined)
      problems.push(...match(expected["response"], last, `${where} response`));
  }

  if (stub) {
    const recorded = await servers.fetch(
      new Request(`${servers.stubUrl}/__stub/runs/${token}/requests`),
    );
    const { requests } = (await recorded.json()) as { requests: unknown[] };
    problems.push(...match(substitute(scenario.expectRequests, variables), requests, "requests"));
  }
  return problems;
}

/** CNF-8: every scenario either ran or is in skip.json with a reason and an issue. */
export function notRun(
  scenarios: readonly Scenario[],
  ran: ReadonlySet<string>,
  skips: readonly { id: string; reason: string; issue: string }[],
): string[] {
  const problems: string[] = [];
  for (const skip of skips) {
    if (
      skip.reason === "" ||
      !/^https:\/\/github\.com\/orvanohq\/[^/]+\/issues\/\d+$/.test(skip.issue)
    ) {
      problems.push(`skip.json: ${skip.id} needs a reason and an orvanohq issue link.`);
    }
  }
  const skipped = new Set(skips.map((skip) => skip.id));
  for (const scenario of scenarios) {
    if (!ran.has(scenario.id) && !skipped.has(scenario.id))
      problems.push(`${scenario.id} did not run and is not in skip.json.`);
  }
  return problems;
}

function randomToken(): string {
  return Array.from({ length: 16 }, () => Math.floor(Math.random() * 36).toString(36)).join("");
}

function parse(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

// Spec 0014 RGN-1 to RGN-3, RGN-6: @orvano/nextjs has no generated code (GNR-3). It follows the contract through
// the @orvano/client and @orvano/server tarballs it is tested against, packed from the sdk-js and sdk-js-server
// commits in orvano-contract.json (spec 0005: packed tarballs until feature 52 publishes).
//   pnpm regenerate                          check the orvano pin, pack both tarballs into vendor/, copy the
//                                            conformance dispatchers and scenarios, refresh the lockfile
//   pnpm regenerate --pin <40 hex>           move the orvano pin first
//   pnpm regenerate --sdk-js <40 hex>        move the sdk-js pin first (and --sdk-js-server <40 hex>)
//   pnpm regenerate --latest-sdks            move both SDK pins to their repos' current main
//   pnpm regenerate --fetch-only             fetch and check the orvano pin only (conformance needs its compose file)
// CI runs `pnpm regenerate` and then `git diff --exit-code` (the drift check, spec 0005 CGN-3).
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";

const root = new URL("../..", import.meta.url).pathname;
const pinPath = join(root, "orvano-contract.json");
const orvanoCheckout = join(root, ".orvano");
const vendor = join(root, "vendor");
const conformance = join(root, "packages", "nextjs", "conformance");
const commitPattern = /^[0-9a-f]{40}$/;

/** The two SDK repos the tarballs come from, and the entry of this package whose services the dispatcher calls. */
const sdks = [
  { field: "sdkJsCommit", flag: "sdk-js", repo: "sdk-js", pkg: "client", entry: "client" },
  {
    field: "sdkJsServerCommit",
    flag: "sdk-js-server",
    repo: "sdk-js-server",
    pkg: "server",
    entry: "server",
  },
];

/**
 * Runs a command and stops with its exit code when it fails.
 * @param {string} command
 * @param {string[]} args
 * @param {{ cwd?: string, quiet?: boolean }} [options]
 * @returns {string}
 */
function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? root,
    encoding: "utf8",
    stdio: options.quiet === true ? ["ignore", "pipe", "pipe"] : ["ignore", "pipe", "inherit"],
    env: { ...process.env, ORVANO_SKIP_HOOKS: "1" },
    shell: process.platform === "win32",
  });
  if (result.status !== 0) {
    console.error(
      `regenerate: \`${command} ${args.join(" ")}\` failed.${options.quiet === true ? `\n${result.stderr}` : ""}`,
    );
    process.exit(result.status ?? 1);
  }
  return result.stdout.trim();
}

/** Fetches one commit of a public orvanohq repo into a folder with no token, unless it is already there. */
function fetchCommit(
  /** @type {string} */ repo,
  /** @type {string} */ checkout,
  /** @type {string} */ commit,
) {
  if (!existsSync(join(checkout, ".git"))) {
    mkdirSync(checkout, { recursive: true });
    run("git", ["init", "-q", checkout]);
  }
  const head = spawnSync("git", ["-C", checkout, "rev-parse", "HEAD"], {
    encoding: "utf8",
  }).stdout.trim();
  if (head === commit) return;
  run("git", [
    "-C",
    checkout,
    "fetch",
    "-q",
    "--depth",
    "1",
    `https://github.com/orvanohq/${repo}`,
    commit,
  ]);
  run("git", ["-C", checkout, "checkout", "-q", "--detach", "FETCH_HEAD"]);
}

/** The current main commit of a public orvanohq repo. */
function latestMain(/** @type {string} */ repo) {
  const line = run("git", ["ls-remote", `https://github.com/orvanohq/${repo}`, "refs/heads/main"]);
  return line.split(/\s/)[0] ?? "";
}

/** The public contract's version and hash at the checked out orvano commit (RGN-1). */
function contractFacts() {
  const bytes = readFileSync(join(orvanoCheckout, "api", "openapi.json"));
  const document = /** @type {{ info: { version: string } }} */ (
    JSON.parse(bytes.toString("utf8"))
  );
  return {
    apiVersion: document.info.version,
    contractSha256: createHash("sha256").update(bytes).digest("hex"),
  };
}

/** Checks a commit argument, stopping with a usage error for anything but 40 lowercase hex. */
function commitArg(/** @type {string} */ flag, /** @type {string} */ value) {
  if (!commitPattern.test(value)) {
    console.error(`regenerate: --${flag} needs a 40 character lowercase commit SHA.`);
    process.exit(2);
  }
  return value;
}

const { values } = parseArgs({
  options: {
    pin: { type: "string" },
    "sdk-js": { type: "string" },
    "sdk-js-server": { type: "string" },
    "latest-sdks": { type: "boolean" },
    "fetch-only": { type: "boolean" },
  },
  strict: true,
});

/** @type {{ commit: string, apiVersion: string, contractSha256: string, sdkJsCommit: string, sdkJsServerCommit: string }} */
const pin = JSON.parse(readFileSync(pinPath, "utf8"));
if (values.pin !== undefined) {
  pin.commit = commitArg("pin", values.pin);
  fetchCommit("orvano", orvanoCheckout, pin.commit);
  Object.assign(pin, contractFacts());
}
for (const sdk of sdks) {
  const given = values[/** @type {"sdk-js" | "sdk-js-server"} */ (sdk.flag)];
  if (given !== undefined) pin[sdk.field] = commitArg(sdk.flag, given);
  else if (values["latest-sdks"] === true) pin[sdk.field] = latestMain(sdk.repo);
}
writeFileSync(
  pinPath,
  `${JSON.stringify(
    {
      commit: pin.commit,
      apiVersion: pin.apiVersion,
      contractSha256: pin.contractSha256,
      sdkJsCommit: pin.sdkJsCommit,
      sdkJsServerCommit: pin.sdkJsServerCommit,
    },
    null,
    2,
  )}\n`,
);

for (const field of ["commit", "sdkJsCommit", "sdkJsServerCommit"]) {
  if (!commitPattern.test(pin[/** @type {"commit"} */ (field)])) {
    console.error(
      `regenerate: orvano-contract.json needs ${field} as a 40 character lowercase commit.`,
    );
    process.exit(1);
  }
}
fetchCommit("orvano", orvanoCheckout, pin.commit);

// RGN-3: the pin must describe the contract at its commit.
const facts = contractFacts();
if (facts.contractSha256 !== pin.contractSha256 || facts.apiVersion !== pin.apiVersion) {
  console.error(
    `regenerate: orvano-contract.json says ${pin.apiVersion} (sha256 ${pin.contractSha256}), but api/openapi.json at ` +
      `${pin.commit} is ${facts.apiVersion} (sha256 ${facts.contractSha256}). Run pnpm regenerate --pin ${pin.commit}.`,
  );
  process.exit(1);
}
if (values["fetch-only"] === true) process.exit(0);

/**
 * The runtime/client.js helpers the dispatcher imports. tsdown drops an @internal helper from the tarball until a
 * shipped service uses it (today projectId and pathParam, used only by the stub's fixture services), so each one the
 * built module lacks is lifted verbatim from that SDK's source at the pinned commit. It runs over the tarball's own
 * configOf, so a client the entry made is found in the same registry.
 * @param {{ repo: string, pkg: string }} sdk
 * @param {string} commit
 * @param {string} checkout
 * @param {string} runtime
 * @param {string} dispatcherSource
 */
function runtimeShim(sdk, commit, checkout, runtime, dispatcherSource) {
  const imported = /import \{([^}]*)\} from "\.\.\/src\/runtime\/client\.js";/.exec(
    dispatcherSource,
  );
  const names = (imported?.[1] ?? "")
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean);
  const built = readFileSync(
    join(checkout, "packages", sdk.pkg, "dist", "runtime", "client.js"),
    "utf8",
  );
  const exported = new Set(
    [...built.matchAll(/export \{([^}]*)\}/g)].flatMap((match) =>
      (match[1] ?? "").split(",").map((name) => name.trim()),
    ),
  );
  const sourceText = readFileSync(
    join(checkout, "packages", sdk.pkg, "src", "runtime", "client.ts"),
    "utf8",
  );
  const reexported = names.filter((name) => exported.has(name));
  const lifted = names
    .filter((name) => !exported.has(name))
    .map((name) => {
      const body = new RegExp(`export function ${name}\\([\\s\\S]*?\\n}\\n`).exec(sourceText);
      if (body === null) {
        console.error(
          `regenerate: ${sdk.repo}'s runtime/client.ts has no function ${name} to lift.`,
        );
        process.exit(1);
      }
      return body[0];
    });
  if (lifted.some((body) => body.includes("configOf(")) && !exported.has("configOf")) {
    console.error(`regenerate: the packed @orvano/${sdk.pkg} no longer exports configOf.`);
    process.exit(1);
  }
  return [
    "// @generated",
    `// Written by tooling/scripts/regenerate.mjs: the runtime helpers the dispatcher imports, from the packed`,
    `// @orvano/${sdk.pkg}. Helpers its build drops are lifted from orvanohq/${sdk.repo}@${commit}`,
    "// src/runtime/client.ts, over the tarball's own configOf. Do not edit.",
    "// @ts-nocheck",
    `import { configOf } from "${runtime}client.js";`,
    reexported.length > 0 ? `export { ${reexported.join(", ")} } from "${runtime}client.js";` : "",
    "",
    "type OrvanoClient = object;",
    "",
    ...lifted,
  ].join("\n");
}

mkdirSync(vendor, { recursive: true });
for (const sdk of sdks) {
  const commit = pin[/** @type {"sdkJsCommit"} */ (sdk.field)];
  const checkout = join(root, ".sdks", sdk.repo);
  fetchCommit(sdk.repo, checkout, commit);
  const filter = `@orvano/${sdk.pkg}`;
  run("pnpm", ["install", "--frozen-lockfile"], { cwd: checkout, quiet: true });
  run("pnpm", ["--filter", filter, "build"], { cwd: checkout, quiet: true });
  run("pnpm", ["--filter", filter, "pack", "--pack-destination", vendor], {
    cwd: checkout,
    quiet: true,
  });

  // CNF-4: that SDK's dispatcher and scenarios, with the service imports pointed at this package's entry and the
  // runtime imports at the installed tarball, so a step calls the service @orvano/nextjs re-exports. The tarball's
  // declarations leave out the @internal runtime helpers the fixture services use, so the copy is not type checked
  // here; its source repo checks it at the same commit.
  const from = join(checkout, "packages", sdk.pkg, "conformance");
  const to = join(conformance, sdk.entry);
  mkdirSync(to, { recursive: true });
  const runtime = `../../node_modules/@orvano/${sdk.pkg}/dist/runtime/`;
  const source = readFileSync(join(from, "dispatch.generated.ts"), "utf8");
  writeFileSync(
    join(to, "runtime.generated.ts"),
    runtimeShim(sdk, commit, checkout, runtime, source),
  );
  const redirected = source
    .replace(`from "../src/generated/index.js"`, `from "../../src/${sdk.entry}.js"`)
    .replace(`from "../src/runtime/client.js"`, `from "./runtime.generated.js"`)
    .replaceAll(`from "../src/runtime/`, `from "${runtime}`);
  // The note goes right after the first line, so the generated marker stays first (spec 0005 CGN-1).
  const firstLineEnd = redirected.indexOf("\n") + 1;
  const dispatcher =
    redirected.slice(0, firstLineEnd) +
    `// Copied from orvanohq/${sdk.repo}@${commit} by tooling/scripts/regenerate.mjs, with imports pointed at ` +
    `@orvano/nextjs/${sdk.entry} and the packed @orvano/${sdk.pkg}.\n// @ts-nocheck\n` +
    redirected.slice(firstLineEnd);
  if (dispatcher.includes(`"../src/`)) {
    console.error(
      `regenerate: ${sdk.repo}'s dispatcher imports something this script doesn't redirect.`,
    );
    process.exit(1);
  }
  writeFileSync(join(to, "dispatch.generated.ts"), dispatcher);
  writeFileSync(
    join(to, "scenarios.generated.json"),
    readFileSync(join(from, "scenarios.generated.json"), "utf8"),
  );
}

// The tarballs' integrity hashes live in the lockfile, so a new tarball changes it (the drift check sees that).
run("pnpm", ["install", "--no-frozen-lockfile"], { quiet: true });
run("pnpm", ["exec", "vp", "fmt", join(conformance, "client"), join(conformance, "server")]);
console.log(
  `regenerate: vendor/ matches sdk-js ${pin.sdkJsCommit.slice(0, 7)} and sdk-js-server ` +
    `${pin.sdkJsServerCommit.slice(0, 7)}, contract ${pin.apiVersion} at orvano ${pin.commit.slice(0, 7)}.`,
);

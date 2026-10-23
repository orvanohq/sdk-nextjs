// Spec 0005 NXT-5: the one module that reads environment variables. Options win; these fill in what an app leaves
// out. Each read is a literal `process.env.NAME`, so Next inlines the NEXT_PUBLIC_ ones into browser bundles.
// @orvano/client and @orvano/server never read the environment themselves.

/** Only the part of Node's `process` this module reads; the edge runtime and Next's browser build provide it too. */
declare const process: { readonly env: Readonly<Record<string, string | undefined>> } | undefined;

/** An unset or empty variable is undefined, so the caller's own error names the option to set. */
function value(raw: string | undefined): string | undefined {
  return raw === undefined || raw === "" ? undefined : raw;
}

/** `NEXT_PUBLIC_ORVANO_URL`, the server URL every factory falls back to. */
export function publicUrl(): string | undefined {
  return typeof process === "undefined" ? undefined : value(process.env.NEXT_PUBLIC_ORVANO_URL);
}

/** `NEXT_PUBLIC_ORVANO_PROJECT`, the project ID every factory falls back to. */
export function publicProject(): string | undefined {
  return typeof process === "undefined" ? undefined : value(process.env.NEXT_PUBLIC_ORVANO_PROJECT);
}

/** `ORVANO_SERVER_KEY`, read by the admin factory only (spec 0005 KEY-4). */
export function serverKey(): string | undefined {
  return typeof process === "undefined" ? undefined : value(process.env.ORVANO_SERVER_KEY);
}

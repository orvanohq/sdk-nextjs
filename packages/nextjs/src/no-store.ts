/** The `fetch` option the SDK clients take. */
type Fetch = (request: Request) => Promise<Response>;

/**
 * Spec 0005 NXT-4: every request the Next.js factories make passes `cache: 'no-store'`, so Next never caches an
 * Orvano response implicitly. Wraps the app's own `fetch` option when it gives one.
 */
export function noStore(given: Fetch | undefined): Fetch {
  return (request) => (given ?? globalThis.fetch)(new Request(request, { cache: "no-store" }));
}

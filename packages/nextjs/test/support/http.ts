// Spec 0005 SQA-2: a stub fetch that records what the SDK sent and answers a health body.
export interface Recorder {
  readonly fetch: (request: Request) => Promise<Response>;
  readonly requests: Request[];
}

/** Records every request and answers each with `{ status: "ok", apiVersions }`. */
export function recorder(apiVersions: readonly string[]): Recorder {
  const requests: Request[] = [];
  return {
    requests,
    fetch: (request) => {
      requests.push(request);
      return Promise.resolve(
        new Response(JSON.stringify({ status: "ok", apiVersions }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );
    },
  };
}

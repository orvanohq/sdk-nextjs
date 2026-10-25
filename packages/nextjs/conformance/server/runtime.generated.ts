// @generated
// Written by tooling/scripts/regenerate.mjs: the runtime helpers the dispatcher imports, from the packed
// @orvano/server. Helpers its build drops are lifted from orvanohq/sdk-js-server@b7bdfbdd156596bb3143241a3fdc906db8fd96a9
// src/runtime/client.ts, over the tarball's own configOf. Do not edit.
// @ts-nocheck
import { configOf } from "../../node_modules/@orvano/server/dist/runtime/client.js";
export { assertClient } from "../../node_modules/@orvano/server/dist/runtime/client.js";

type OrvanoClient = object;

export function pathParam(name: string, value: string | number): string {
  const text = String(value);
  if (text === "") throw new TypeError(`${name} must not be empty.`);
  const decoded = text.replace(/%2e/giu, ".");
  if (decoded === "." || decoded === "..") throw new TypeError(`${name} must not be "." or "..".`);
  return text;
}

export function projectId(client: OrvanoClient): string {
  const project = configOf(client).project;
  if (project === undefined || project === "") {
    throw new TypeError("This call needs a project. Pass project to createClient.");
  }
  return pathParam("project", project);
}

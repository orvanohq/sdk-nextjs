// @generated
// Written by tooling/scripts/regenerate.mjs: the runtime helpers the dispatcher imports, from the packed
// @orvano/client. Helpers its build drops are lifted from orvanohq/sdk-js@f64ee97d627eb7304220bc51793122e1b9893510
// src/runtime/client.ts, over the tarball's own configOf. Do not edit.
// @ts-nocheck
import { configOf } from "../../node_modules/@orvano/client/dist/runtime/client.js";
export { assertClient } from "../../node_modules/@orvano/client/dist/runtime/client.js";

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

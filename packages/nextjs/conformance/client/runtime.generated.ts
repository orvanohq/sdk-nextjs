// @generated
// Written by tooling/scripts/regenerate.mjs: the runtime helpers the dispatcher imports, from the packed
// @orvano/client. Helpers its build drops are lifted from orvanohq/sdk-js@7bec6cbb2c861351cd3081c77dd3cbf015b0f452
// src/runtime/client.ts, over the tarball's own configOf. Do not edit.
// @ts-nocheck
import { configOf } from "../../node_modules/@orvano/client/dist/runtime/client.js";
export { assertClient } from "../../node_modules/@orvano/client/dist/runtime/client.js";

type OrvanoClient = object;

export function pathParam(name: string, value: string | number): string {
  const text = String(value);
  if (text === "") throw new TypeError(`${name} must not be empty.`);
  return text;
}

export function projectId(client: OrvanoClient): string {
  const project = configOf(client).project;
  if (project === undefined || project === "") {
    throw new TypeError("This call needs a project. Pass project to createClient.");
  }
  return project;
}

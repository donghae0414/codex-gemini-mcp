import { createRequire } from "node:module";

type PackageJson = {
  version?: unknown;
};

function readPackageVersion(): string {
  const require = createRequire(import.meta.url);
  const pkg = require("../package.json") as PackageJson;
  if (typeof pkg.version !== "string" || pkg.version.trim().length === 0) {
    throw new Error("invalid package.json version");
  }
  return pkg.version;
}

export const VERSION = readPackageVersion();

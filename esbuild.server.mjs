import * as esbuild from "esbuild";
import { fileURLToPath } from "node:url";
import path from "node:path";

const dir = path.dirname(fileURLToPath(import.meta.url));

await esbuild.build({
  entryPoints: [path.join(dir, "server/index.ts")],
  outfile: path.join(dir, "dist/server.js"),
  bundle: true,
  platform: "node",
  format: "esm",
  packages: "external",
  target: "node20",
});

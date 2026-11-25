import { build } from "esbuild";

await build({
  entryPoints: ["src/app.ts"],
  outfile: "../../api/express-app.cjs",
  bundle: true,
  format: "cjs",
  platform: "node",
  target: "node22",
  sourcemap: false,
  packages: "bundle",
  logLevel: "info",
});

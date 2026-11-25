// The generated bundle is created by the Vercel build command before Functions are compiled.
// @ts-ignore Generated CommonJS bundle has no separate declaration file.
import importedApp from "./express-app.cjs";

const app = typeof importedApp === "function"
  ? importedApp
  : (importedApp as unknown as { default: typeof importedApp }).default;

export function createHandler(routePath?: string) {
  return function handler(req: any, res: any) {
    if (typeof req.url === "string") {
      if (routePath && (req.url === "/" || req.url.startsWith("/?"))) {
        req.url = `/api/${routePath}${req.url.slice(1)}`;
      } else if (!req.url.startsWith("/api")) {
        req.url = `/api${req.url.startsWith("/") ? "" : "/"}${req.url}`;
      }
    }
    return app(req, res);
  };
}

export default createHandler();

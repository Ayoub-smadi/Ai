import importedApp from "../artifacts/api-server/src/app";

const app = typeof importedApp === "function"
  ? importedApp
  : (importedApp as unknown as { default: typeof importedApp }).default;

export default app;

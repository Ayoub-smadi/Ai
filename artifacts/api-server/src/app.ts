import express, { type Express } from "express";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(express.json({ limit: "6mb" }));
app.use(express.urlencoded({ extended: true }));
const mutatingMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);
app.use("/api", (req, res, next) => {
  if (!mutatingMethods.has(req.method)) return next();
  if (
    req.get("X-App-Request") !== "1" ||
    req.get("Sec-Fetch-Site") === "cross-site"
  ) {
    res.status(403).json({ error: "Cross-site API requests are not allowed." });
    return;
  }
  next();
});
app.use("/api", router);

export default app;

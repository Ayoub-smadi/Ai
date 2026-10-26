import { Router, type IRouter } from "express";
import agentsRouter from "./agents";
import authRouter from "./auth";
import channelsRouter from "./channels";
import dashboardRouter from "./dashboard";
import healthRouter from "./health";
import knowledgeRouter from "./knowledge";
import productsRouter from "./products";
import siteRouter from "./site";
import storeRouter from "./store";
import testingRouter from "./testing";
import workspacesRouter from "./workspaces";

const router: IRouter = Router();

router.use(authRouter);
router.use(healthRouter);
router.use(workspacesRouter);
router.use(dashboardRouter);
router.use(agentsRouter);
router.use(productsRouter);
router.use(siteRouter);
router.use(storeRouter);
router.use(knowledgeRouter);
router.use(testingRouter);
router.use(channelsRouter);

export default router;

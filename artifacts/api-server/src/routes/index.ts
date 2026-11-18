import { Router, type IRouter } from "express";
import agentsRouter from "./agents";
import channelsRouter from "./channels";
import clientStorageRouter from "./client-storage";
import dashboardRouter from "./dashboard";
import healthRouter from "./health";
import landscapeAiRouter from "./landscape-ai";
import plantAdvisorRouter from "./plant-advisor";
import knowledgeRouter from "./knowledge";
import productsRouter from "./products";
import testingRouter from "./testing";
import workspacesRouter from "./workspaces";

const router: IRouter = Router();

router.use(healthRouter);
router.use(landscapeAiRouter);
router.use(plantAdvisorRouter);
router.use(workspacesRouter);
router.use(dashboardRouter);
router.use(agentsRouter);
router.use(productsRouter);
router.use(knowledgeRouter);
router.use(testingRouter);
router.use(channelsRouter);
router.use(clientStorageRouter);

export default router;

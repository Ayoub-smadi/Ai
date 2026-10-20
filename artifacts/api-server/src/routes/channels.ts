import { Router, type IRouter } from "express";
import { ListChannelsResponse } from "@workspace/api-zod";
import { getWorkspaceContext, requireAuth } from "../middlewares/auth";

const router: IRouter = Router();
router.use("/channels", requireAuth);

router.get("/channels", async (req, res): Promise<void> => {
  const context = await getWorkspaceContext(req, res);
  if (!context) return;
  // No external channel is reported as connected until verified credentials,
  // account authorization, and webhook delivery are implemented.
  res.json(
    ListChannelsResponse.parse([
      {
        id: "website",
        name: "Website chat",
        status: "not_configured",
        detail: "Widget publishing and origin verification are not configured yet.",
      },
      {
        id: "whatsapp",
        name: "WhatsApp Business",
        status: "not_configured",
        detail: "Requires an authorized Meta business account and verified webhook.",
      },
      {
        id: "instagram",
        name: "Instagram Messaging",
        status: "not_configured",
        detail: "Requires an eligible professional account and Meta permissions.",
      },
      {
        id: "messenger",
        name: "Facebook Messenger",
        status: "not_configured",
        detail: "Requires an authorized Facebook Page and verified webhook.",
      },
    ]),
  );
});

export default router;

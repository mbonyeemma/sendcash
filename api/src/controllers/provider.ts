/**
 * Provider controller: quote generation, onramp request, confirm pay-in.
 * Onramp flow: quote → onramp request (pending tx + pay-in instructions) → user pays to PAY_IN_ADDRESS with reference → confirm pay-in → wallet sends RLUSD.
 */
import { Router, Request, Response } from "express";
import { tokenRequired } from "../middleware/auth";
import { Wallet } from "../models/Wallet";

const router = Router();

/** Get onramp quote: amount_ugx or amount_rlusd */
router.post("/quote", tokenRequired, async (req: Request, res: Response) => {
  try {
    const result = await new Wallet().getOnrampQuote(req.body);
    res.status(result.status === 200 ? 200 : result.status === 400 ? 400 : 500).json(result);
  } catch (e: any) {
    console.error("provider/quote error:", e);
    res.status(500).json({ status: 500, message: e?.message || "Quote failed" });
  }
});

/** Create onramp request: returns pay_in_address + reference; creates pending transaction */
router.post("/onrampRequest", tokenRequired, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId || req.body?.userId;
    if (!userId) {
      return res.status(401).json({ status: 401, message: "Unauthorized" });
    }
    const body = { ...req.body, userId };
    const result = await new Wallet().createOnrampRequest(body);
    res.status(result.status === 200 ? 200 : result.status === 400 ? 400 : 500).json(result);
  } catch (e: any) {
    console.error("provider/onrampRequest error:", e);
    res.status(500).json({ status: 500, message: e?.message || "Onramp request failed" });
  }
});

/** Confirm pay-in received at PAY_IN_ADDRESS (provider/webhook): wallet takes over and sends RLUSD */
router.post("/confirmPayIn", async (req: Request, res: Response) => {
  try {
    const { reference } = req.body;
    if (!reference) {
      return res.status(400).json({ status: 400, message: "reference required" });
    }
    const result = await new Wallet().confirmOnrampPayIn(reference);
    res.status(result.status === 200 ? 200 : result.status === 404 ? 404 : 500).json(result);
  } catch (e: any) {
    console.error("provider/confirmPayIn error:", e);
    res.status(500).json({ status: 500, message: e?.message || "Confirm pay-in failed" });
  }
});

export default router;

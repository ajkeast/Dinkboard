import express from "express";
import { z } from "zod";
import { getBalances, getTransactions } from "../controllers/dinkcoinController.js";
import { validate, limitParam } from "../middleware/validate.js";

const router = express.Router();

const transactionsQuery = z.object({ limit: limitParam.optional() });

router.get("/balances", getBalances);
router.get(
    "/transactions",
    validate({ query: transactionsQuery }),
    getTransactions
);

export default router;

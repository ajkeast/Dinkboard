import express from "express";
import { z } from "zod";
import {
    getFirstsAll,
    getFirstsById,
    getFirstsFew,
    getFirstsScore,
    getCumCount,
    getJuice,
    getJuicePerUser
} from "../controllers/firstsController.js";
import { validate, snowflakeId, limitParam } from "../middleware/validate.js";

const router = express.Router();

// Order matters: specific routes must come before the "/:id" catch-all.
router.get("/score", getFirstsScore);
router.get("/cumcount", getCumCount);
router.get("/juice/members", getJuicePerUser);
router.get("/juice", getJuice);
router.get("/limit/:limit", validate({ params: z.object({ limit: limitParam }) }), getFirstsFew);
router.get("/", getFirstsAll);
router.get("/:id", validate({ params: z.object({ id: snowflakeId }) }), getFirstsById);

export default router;

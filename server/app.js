import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import firstsRoutes from "./routes/firstsRoutes.js";
import emojiRoutes from "./routes/emojiRoutes.js";
import memberRoutes from "./routes/memberRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import { requireAuth } from "./middleware/auth.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { apiLimiter } from "./middleware/rateLimit.js";
import { db } from "./models/database.js";

dotenv.config();

export function createApp() {
    const app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));
    app.use(helmet());
    app.use(helmet.crossOriginResourcePolicy({ policy: "cross-origin" }));
    // Quiet logs in test; keep common in other envs
    if (process.env.NODE_ENV !== 'test') {
        app.use(morgan("common"));
    }
    app.use(cookieParser());

    const corsOrigins = process.env.CORS_ORIGIN
        ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
        : ['http://localhost:3000', 'http://localhost:5173'];
    app.use(cors({ origin: corsOrigins, credentials: true }));

    app.use('/api', apiLimiter);

    app.get('/api/health', async (req, res) => {
        try {
            await db.query('SELECT 1');
            res.status(200).json({ status: 'ok', db: 'up' });
        } catch {
            res.status(503).json({ status: 'degraded', db: 'down' });
        }
    });
    app.use("/api/auth", authRoutes);

    app.use("/api/firsts", requireAuth, firstsRoutes);
    app.use("/api/emojis", requireAuth, emojiRoutes);
    app.use("/api/members", requireAuth, memberRoutes);
    app.use("/api/messages", requireAuth, messageRoutes);
    app.use("/api/ai", requireAuth, aiRoutes);

    app.use(notFoundHandler);
    app.use(errorHandler);

    return app;
}

const app = createApp();
export default app;

import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import morgan from 'morgan';
import firstsRoutes from "./routes/firstsRoutes.js";
import emojiRoutes from "./routes/emojiRoutes.js";
import memberRoutes from "./routes/memberRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";

// CONFIGURATION
dotenv.config();
const app = express();
app.use(express.json());
app.use(helmet());
app.use(helmet.crossOriginResourcePolicy({ policy: "cross-origin" }));
app.use(morgan("common"))
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }))
app.use(cors());

// ROUTES
app.use("/api/firsts", firstsRoutes);
app.use("/api/emojis", emojiRoutes);
app.use("/api/members", memberRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/ai", aiRoutes);

// LISTEN
const PORT = 5001;
app.listen(PORT, () => console.log(`Server Port: ${PORT}`))

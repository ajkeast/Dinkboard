import mysql from "mysql2";
import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import morgan from 'morgan';
import chatRoutes from "./routes/chat.js";
import clientRoutes from "./routes/client.js";
import memberRoutes from "./routes/members.js"

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
app.use("/chat", chatRoutes);
app.use("/client", clientRoutes);
app.use("/members", memberRoutes)

// LISTEN

const PORT = 5001;
app.listen(PORT, () => console.log(`Server Port: ${PORT}`))
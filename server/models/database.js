import mysql from "mysql2";
import dotenv from "dotenv";

dotenv.config();

export const pool = mysql.createPool({
        host:process.env.SQL_HOST,
        user:process.env.SQL_USER,
        password:process.env.SQL_PASSWORD,
        database:process.env.SQL_DATABASE,
        timezone: 'Z'
    }).promise();
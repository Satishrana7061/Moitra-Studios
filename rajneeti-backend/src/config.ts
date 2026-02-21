// src/config.ts
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

export const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
export const PORT = parseInt(process.env.PORT || "4000", 10);
export const REFRESH_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

if (!GEMINI_API_KEY) {
    console.warn(
        "⚠️  GEMINI_API_KEY not set in rajneeti-backend/.env — AI processing will fail."
    );
}

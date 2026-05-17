const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const session = require("express-session");
const rateLimit = require("express-rate-limit");
const compression = require("compression");
const helmet = require("helmet");
require("dotenv").config();
const { client } = require("./db");

// ── Validate required environment variables ──
const REQUIRED_ENV = ["DATABASE_URL", "JWT_SECRET", "SESSION_SECRET"];
for (const key of REQUIRED_ENV) {
    if (!process.env[key]) {
        console.error(`❌ FATAL: Missing required environment variable: ${key}`);
        process.exit(1);
    }
}

const UsersRoutes = require("./Routers/UsersRoutes");
const quizRoutes = require("./Routers/QuizRoutes");
const RoomsRoutes = require("./Routers/RoomsRoutes");
const gameRoutes = require("./Routers/GameRoutes");
const leaderboardRoutes = require("./Routers/LeaderBoardRoutes");
const aiRoutes = require("./Routers/AiRoutes");

const app = express();
const port = process.env.PORT || 3000;

// 1. Security headers
app.use(helmet());

// 2. CORS
app.use(
    cors({
        origin: process.env.FRONTEND_URL || "https://quize-game-platform-eg2y.vercel.app",
        credentials: true,
    })
);
app.use(compression());

// 3. Body parsers with size limit to prevent payload DoS
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

// 4. Request logger (sanitized — never log passwords or sensitive data)
app.use((req, res, next) => {
    const sanitizedBody = req.body ? { ...req.body } : {};
    // Remove sensitive fields from logs
    delete sanitizedBody.password;
    delete sanitizedBody.token;
    delete sanitizedBody.googleId;
    console.log(
        `📨 ${req.method} ${req.path}`,
        Object.keys(sanitizedBody).length > 0 ? JSON.stringify(sanitizedBody) : ""
    );
    next();
});

// 5. Session
app.use(
    session({
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
        cookie: {
            secure: process.env.NODE_ENV === "production",
            httpOnly: true,
            sameSite: "strict",
            maxAge: 24 * 60 * 60 * 1000,
        },
    })
);

// 6. Rate limiter BEFORE routes
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { error: "Too many requests, slow down!" },
});
app.use("/api/", limiter);

// 7. Routes
app.use("/api/UsersRoutes", UsersRoutes);
app.use("/api/auth", UsersRoutes);
app.use("/api/QuizRoutes", quizRoutes);
app.use("/api/quiz", quizRoutes);
app.use("/api/RoomsRoutes", RoomsRoutes);
app.use("/api/room", RoomsRoutes);
app.use("/api/GameRoutes", gameRoutes);
app.use("/api/game", gameRoutes);
app.use("/api/LeaderBoardRoutes", leaderboardRoutes);
app.use("/api/leaderboard", leaderboardRoutes);
app.use("/api/ai", aiRoutes);

// 8. Health check
app.get("/api/health", async (_req, res) => {
    let dbStatus = "unknown";
    try {
        await client.query("SELECT 1");
        dbStatus = "connected";
    } catch {
        dbStatus = "disconnected";
    }
    res.json({
        status: "OK",
        message: "Quiz Game SQL Server is running!",
        database: dbStatus,
        timestamp: new Date(),
    });
});

// 9. Global error handler — always last
app.use((err, _req, res, _next) => {
    console.error("❌ Global Error Handler:", err.message);
    const isDev = process.env.NODE_ENV === "development";
    res.status(500).json({
        message: "Internal Server Error",
        ...(isDev && { error: err.message, stack: err.stack }),
    });
});

const server = app.listen(port, () => {
    console.log(`🚀 Server running on port ${port}`);
    console.log(`📅 Started at: ${new Date().toISOString()}`);
});

const shutdown = async () => {
    try {
        await client.end();
    } finally {
        process.exit(0);
    }
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

server.on("close", async () => {
    await client.end();
});
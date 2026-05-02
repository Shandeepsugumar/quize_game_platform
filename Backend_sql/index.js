const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const session = require("express-session");
require("dotenv").config();
const { client } = require("./db");

const UsersRoutes = require("./Routers/UsersRoutes");
const quizRoutes = require("./Routers/QuizRoutes");
const RoomsRoutes = require("./Routers/RoomsRoutes");
const gameRoutes = require("./Routers/GameRoutes");
const leaderboardRoutes = require("./Routers/LeaderBoardRoutes");

const app = express();
const port = process.env.PORT || 3000;

app.use(
    cors({
        origin: true,
        credentials: true,
    })
);

app.use(express.json());
app.use(cookieParser());
app.use(
    session({
        secret: process.env.SESSION_SECRET || "quiz-game-secret-key-2024",
        resave: false,
        saveUninitialized: false,
        cookie: {
            secure: false,
            httpOnly: true,
            maxAge: 24 * 60 * 60 * 1000,
        },
    })
);

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

app.get("/api/health", (_req, res) => {
    res.json({ status: "OK", message: "Quiz Game SQL Server is running!" });
});

app.use((err, _req, res, _next) => {
    res.status(500).json({
        message: "Internal Server Error",
        error: err.message,
        stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
    });
});

const server = app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
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
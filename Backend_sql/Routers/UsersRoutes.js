const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { db } = require("../db");
const { eq } = require("drizzle-orm");
const { users } = require("../Schema");
const authMiddleware = require("../middleware/auth");
const { sanitizeUser } = require("../utils/helpers");
const { registerUser, loginUser, googleAuth, middleware, updateUser, logoutUser } = require("../Controllers/UsersController");

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "quiz-game-jwt-secret-2024";

const generateToken = (userId) => jwt.sign({ userId }, JWT_SECRET, { expiresIn: "7d" });

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/google", googleAuth);
router.get("/me", authMiddleware, middleware);
router.put("/update-profile", authMiddleware, updateUser);
router.post("/logout", logoutUser);

module.exports = router;

const express = require("express");
const authMiddleware = require("../middleware/auth");
const { chat, aiLimiter } = require("../Controllers/AiController");

const router = express.Router();

router.use(aiLimiter);

router.post("/chat", authMiddleware, chat);

module.exports = router;

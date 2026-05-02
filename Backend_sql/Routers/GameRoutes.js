const express = require("express");
const { client } = require("../db");
const authMiddleware = require("../middleware/auth");
const { normalizeRoomCode, withDefaultPowerUps } = require("../utils/helpers");
const { getAnswer, getcompleteGame, getResults } = require("../Controllers/GameController");

const router = express.Router();

router.post("/answer", authMiddleware, getAnswer);

router.post("/complete", authMiddleware, getcompleteGame);

router.get("/results/:roomCode", authMiddleware, getResults);

module.exports = router;

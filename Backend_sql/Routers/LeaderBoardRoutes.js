const express = require("express");
const { client } = require("../db");
const { getGlobalLeaderboard, getRecentLeaderboard, getUserLeaderboard } = require("../Controllers/LeaderboardController");

const router = express.Router();

router.get("/global", getGlobalLeaderboard);

router.get("/recent", getRecentLeaderboard);

router.get("/user/:userId", getUserLeaderboard);

module.exports = router;

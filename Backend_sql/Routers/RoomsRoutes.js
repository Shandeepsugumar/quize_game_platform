const express = require("express");
const authMiddleware = require("../middleware/auth");
const { CreateRoom, JoinRoom, ActiveAll, RoomCode, PowerUp, StartGame } = require("../Controllers/RoomController");
const router = express.Router();

router.post("/create", authMiddleware, CreateRoom);
router.post("/join", authMiddleware, JoinRoom);
router.get("/active/all", ActiveAll);
router.get("/:roomCode", authMiddleware, RoomCode);
router.post("/:roomCode/toggle-powerups", authMiddleware, PowerUp);
router.post("/:roomCode/start", authMiddleware, StartGame);

module.exports = router;

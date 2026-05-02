const { db } = require("../db");
const { eq, desc, inArray } = require("drizzle-orm");
const { users, quizzes, rooms } = require("../Schema");
const { generateRoomCode, normalizeRoomCode, withDefaultPowerUps } = require("../utils/helpers");

const createPlayerPayload = (userId) => ({
  user: userId,
  score: 0,
  answers: [],
  powerUps: {
    doublePoints: 2,
    freezeTime: 2,
    skipQuestion: 1,
  },
  joinedAt: new Date().toISOString(),
});

const hydratePlayers = async (players) => {
  const safePlayers = Array.isArray(players) ? players : [];
  if (safePlayers.length === 0) {
    return [];
  }

  const ids = [
    ...new Set(
      safePlayers
        .map((player) => Number(player?.user?.id || player?.user))
        .filter((id) => Number.isInteger(id) && id > 0)
    ),
  ];

  if (ids.length === 0) {
    return safePlayers.map((player) => ({
      ...withDefaultPowerUps(player),
      user: { id: Number(player?.user?.id || player?.user), username: "Unknown", avatar: null },
    }));
  }

  const userRows = await db
    .select({
      id: users.id,
      username: users.username,
      avatar: users.avatar,
    })
    .from(users)
    .where(inArray(users.id, ids));

  const byId = new Map(userRows.map((user) => [Number(user.id), user]));

  return safePlayers.map((player) => {
    const userId = Number(player?.user?.id || player?.user);
    return {
      ...withDefaultPowerUps(player),
      user: byId.get(userId) || { id: userId, username: "Unknown", avatar: null },
    };
  });
};

const getRoomByCode = async (roomCode) => {
  const normalizedRoomCode = normalizeRoomCode(roomCode);
  if (!normalizedRoomCode) {
    return null;
  }

  const roomRows = await db
    .select({
      id: rooms.id,
      roomCode: rooms.roomCode,
      name: rooms.name,
      players: rooms.players,
      maxPlayers: rooms.maxPlayers,
      status: rooms.status,
      powerUpsEnabled: rooms.powerUpsEnabled,
      currentQuestion: rooms.currentQuestion,
      startedAt: rooms.startedAt,
      completedAt: rooms.completedAt,
      createdAt: rooms.createdAt,
      quizId: quizzes.id,
      quizTitle: quizzes.title,
      quizDescription: quizzes.description,
      quizCategory: quizzes.category,
      quizDifficulty: quizzes.difficulty,
      quizQuestions: quizzes.questions,
      hostId: users.id,
      hostUsername: users.username,
      hostAvatar: users.avatar,
    })
    .from(rooms)
    .innerJoin(quizzes, eq(quizzes.id, rooms.quizId))
    .innerJoin(users, eq(users.id, rooms.hostId))
    .where(eq(rooms.roomCode, normalizedRoomCode))
    .limit(1);

  if (roomRows.length === 0) {
    return null;
  }

  const row = roomRows[0];
  const hydratedPlayers = await hydratePlayers(row.players);

  return {
    id: row.id,
    roomCode: row.roomCode,
    name: row.name,
    quiz: {
      id: row.quizId,
      title: row.quizTitle,
      description: row.quizDescription,
      category: row.quizCategory,
      difficulty: row.quizDifficulty,
      questions: row.quizQuestions,
    },
    host: {
      id: row.hostId,
      username: row.hostUsername,
      avatar: row.hostAvatar,
    },
    players: hydratedPlayers,
    maxPlayers: row.maxPlayers,
    status: row.status,
    powerUpsEnabled: row.powerUpsEnabled,
    currentQuestion: row.currentQuestion,
    startedAt: row.startedAt,
    completedAt: row.completedAt,
    createdAt: row.createdAt,
  };
};


const CreateRoom = async (req, res) => {
  try {
    const { name, quizId, maxPlayers } = req.body;

    if (!name || !quizId) {
      return res.status(400).json({ message: "Room name and quiz are required" });
    }

    const parsedQuizId = Number(quizId);
    const quizResult = await db
      .select({ id: quizzes.id })
      .from(quizzes)
      .where(eq(quizzes.id, parsedQuizId))
      .limit(1);

    if (quizResult.length === 0) {
      return res.status(404).json({ message: "Quiz not found" });
    }

    let roomCode;
    for (let i = 0; i < 15; i += 1) {
      roomCode = generateRoomCode();
      const existing = await db
        .select({ id: rooms.id })
        .from(rooms)
        .where(eq(rooms.roomCode, roomCode))
        .limit(1);

      if (existing.length === 0) {
        break;
      }
      roomCode = null;
    }

    if (!roomCode) {
      return res.status(500).json({ message: "Could not generate a unique room code" });
    }

    const parsedMaxPlayers = Number(maxPlayers);
    const safeMaxPlayers = Number.isInteger(parsedMaxPlayers) && parsedMaxPlayers > 0 ? parsedMaxPlayers : 10;

    await db.insert(rooms).values({
      roomCode,
      name,
      quizId: parsedQuizId,
      hostId: Number(req.user.id),
      maxPlayers: safeMaxPlayers,
      players: [createPlayerPayload(req.user.id)],
    });

    const room = await getRoomByCode(roomCode);
    return res.status(201).json({ message: "Room created successfully", room });
  } catch (error) {
    return res.status(500).json({ message: "Server error creating room", error: error.message });
  }
};

const JoinRoom = async (req, res) => {
  try {
    const { roomCode } = req.body;
    const code = normalizeRoomCode(roomCode);

    if (!code) {
      return res.status(400).json({ message: "Room code is required" });
    }

    const room = await getRoomByCode(code);
    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    if (room.status !== "waiting") {
      return res.status(400).json({ message: "Game already in progress or completed" });
    }

    if (room.players.length >= room.maxPlayers) {
      return res.status(400).json({ message: "Room is full" });
    }

    const alreadyJoined = room.players.some((p) => Number(p.user.id || p.user) === Number(req.user.id));
    if (alreadyJoined) {
      return res.json({ message: "Already in room", room });
    }

    const updatedPlayers = [...room.players.map((p) => ({ ...p, user: p.user.id || p.user })), createPlayerPayload(req.user.id)];

    await db
      .update(rooms)
      .set({ players: updatedPlayers })
      .where(eq(rooms.roomCode, code));

    const updatedRoom = await getRoomByCode(code);
    return res.json({ message: "Joined room successfully", room: updatedRoom });
  } catch (error) {
    return res.status(500).json({ message: "Server error joining room" });
  }
};

const ActiveAll = async (req, res) => {
  try {
    const activeRooms = await db
      .select({
        id: rooms.id,
        roomCode: rooms.roomCode,
        name: rooms.name,
        maxPlayers: rooms.maxPlayers,
        status: rooms.status,
        createdAt: rooms.createdAt,
        quizId: quizzes.id,
        quizTitle: quizzes.title,
        hostId: users.id,
        hostUsername: users.username,
        hostAvatar: users.avatar,
      })
      .from(rooms)
      .innerJoin(quizzes, eq(quizzes.id, rooms.quizId))
      .innerJoin(users, eq(users.id, rooms.hostId))
      .where(eq(rooms.status, "waiting"))
      .orderBy(desc(rooms.createdAt))
      .limit(20);

    const mappedRooms = activeRooms.map((row) => ({
      id: row.id,
      roomCode: row.roomCode,
      name: row.name,
      maxPlayers: row.maxPlayers,
      status: row.status,
      createdAt: row.createdAt,
      quiz: { id: row.quizId, title: row.quizTitle },
      host: { id: row.hostId, username: row.hostUsername, avatar: row.hostAvatar },
    }));

    return res.json({ rooms: mappedRooms });
  } catch (error) {
    return res.status(500).json({ message: "Server error fetching rooms" });
  }
};

const RoomCode = async (req, res) => {
  try {
    const room = await getRoomByCode(req.params.roomCode);

    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    return res.json({ room });
  } catch (error) {
    return res.status(500).json({ message: "Server error fetching room" });
  }
};

const PowerUp = async (req, res) => {
  try {
    const code = normalizeRoomCode(req.params.roomCode);
    const { powerUpsEnabled } = req.body;

    const room = await getRoomByCode(code);
    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    if (Number(room.host.id) !== Number(req.user.id)) {
      return res.status(403).json({ message: "Only the host can toggle power-ups" });
    }

    if (room.status !== "waiting") {
      return res.status(400).json({ message: "Cannot change power-ups after game has started" });
    }

    await db
      .update(rooms)
      .set({ powerUpsEnabled: Boolean(powerUpsEnabled) })
      .where(eq(rooms.roomCode, code));

    const updatedRoom = await getRoomByCode(code);
    return res.json({
      message: `Power-ups ${powerUpsEnabled ? "enabled" : "disabled"}`,
      room: updatedRoom,
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error toggling power-ups" });
  }
};

const StartGame = async (req, res) => {
  try {
    const code = normalizeRoomCode(req.params.roomCode);
    const room = await getRoomByCode(code);

    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    if (Number(room.host.id) !== Number(req.user.id)) {
      return res.status(403).json({ message: "Only the host can start the game" });
    }

    if (room.players.length < 1) {
      return res.status(400).json({ message: "At least 1 player required to start" });
    }

    await db
      .update(rooms)
      .set({
        status: "in-progress",
        startedAt: new Date(),
        currentQuestion: 0,
      })
      .where(eq(rooms.roomCode, code));

    const updatedRoom = await getRoomByCode(code);
    return res.json({ message: "Game started", room: updatedRoom });
  } catch (error) {
    return res.status(500).json({ message: "Server error starting game" });
  }
};

module.exports = {
  CreateRoom,
  JoinRoom,
  ActiveAll,
  RoomCode,
  PowerUp,
  StartGame,
};
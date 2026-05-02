const { db } = require("../db");
const { and, desc, eq, ilike, or, inArray, gt } = require("drizzle-orm");
const { users, quizzes, rooms, gameResults } = require("../Schema");
const { normalizeRoomCode, withDefaultPowerUps } = require("../utils/helpers");
const { client } = require("../db");


const hydrateUsersByIds = async (ids) => {
  const unique = [...new Set(ids.map((x) => Number(x)).filter(Boolean))];
  if (unique.length === 0) return new Map();

  const rows = await db
    .select({ id: users.id, username: users.username, avatar: users.avatar })
    .from(users)
    .where(inArray(users.id, unique));

  return new Map(rows.map((u) => [Number(u.id), u]));
};

const getAnswer = async (req, res) => {
  try {
    const { roomCode, questionIndex, selectedAnswer, timeSpent } = req.body;

    const code = normalizeRoomCode(roomCode);
    const roomRows = await db
      .select({ id: rooms.id, status: rooms.status, players: rooms.players, questions: quizzes.questions, hostId: rooms.hostId, quizId: rooms.quizId })
      .from(rooms)
      .innerJoin(quizzes, eq(quizzes.id, rooms.quizId))
      .where(eq(rooms.roomCode, code))
      .limit(1);

    if (roomRows.length === 0) {
      return res.status(404).json({ message: "Room not found" });
    }

    const room = roomRows[0];

    if (room.status !== "in-progress") {
      return res.status(400).json({ message: "Game is not in progress" });
    }

    const players = Array.isArray(room.players) ? room.players.map(withDefaultPowerUps) : [];
    const playerIndex = players.findIndex((p) => Number(p.user) === Number(req.user.id));

    if (playerIndex === -1) {
      return res.status(404).json({ message: "Player not found in room" });
    }

    const questions = Array.isArray(room.questions) ? room.questions : [];
    const question = questions[Number(questionIndex)];

    if (!question) {
      return res.status(404).json({ message: "Question not found" });
    }

    const alreadyAnswered = players[playerIndex].answers.some((a) => Number(a.questionIndex) === Number(questionIndex));
    if (alreadyAnswered) {
      return res.status(400).json({ message: "Already answered this question" });
    }

    const isCorrect = Number(selectedAnswer) === Number(question.correctAnswer);
    let points = 0;

    if (isCorrect) {
      const basePoints = Number(question.points || 10);
      const timeLimit = Number(question.timeLimit || 30);
      const safeSpent = Number(timeSpent || timeLimit);
      const timeRatio = Math.max(0, Math.min(1, safeSpent / Math.max(1, timeLimit)));
      const timeBonusMultiplier = 1 + 0.5 * (1 - timeRatio);
      points = Math.round(basePoints * timeBonusMultiplier);
    }

    players[playerIndex].answers.push({
      questionIndex: Number(questionIndex),
      selectedAnswer: Number(selectedAnswer),
      isCorrect,
      points,
      timeSpent: Number(timeSpent || 0),
    });

    players[playerIndex].score = Number(players[playerIndex].score || 0) + points;

    await db.update(rooms).set({ players }).where(eq(rooms.id, room.id));

    return res.json({
      message: "Answer submitted",
      isCorrect,
      points,
      correctAnswer: question.correctAnswer,
      totalScore: players[playerIndex].score,
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error submitting answer" });
  }
};

const getcompleteGame = async (req, res) => {
  const dbClient = await client.connect();
  try {
    const { roomCode } = req.body;

    await dbClient.query("BEGIN");

    const roomResult = await dbClient.query(
      `
      SELECT r.id, r.host_id AS "hostId", r.quiz_id AS "quizId", r.players, q.questions
      FROM rooms r
      JOIN quizzes q ON q.id = r.quiz_id
      WHERE r.room_code = $1
      LIMIT 1
      FOR UPDATE
      `,
      [normalizeRoomCode(roomCode)]
    );

    if (roomResult.rows.length === 0) {
      await dbClient.query("ROLLBACK");
      return res.status(404).json({ message: "Room not found" });
    }

    const room = roomResult.rows[0];

    if (Number(room.hostId) !== Number(req.user.id)) {
      await dbClient.query("ROLLBACK");
      return res.status(403).json({ message: "Only the host can complete the game" });
    }

    const questions = Array.isArray(room.questions) ? room.questions : [];
    const totalQuestions = questions.length;
    const players = Array.isArray(room.players) ? room.players.map(withDefaultPowerUps) : [];

    const rankings = players
      .map((player) => {
        const correctAnswers = player.answers.filter((a) => a.isCorrect).length;
        const accuracy = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;

        return {
          user: Number(player.user),
          score: Number(player.score || 0),
          correctAnswers,
          totalQuestions,
          accuracy,
        };
      })
      .sort((a, b) => b.score - a.score)
      .map((player, index) => ({ ...player, rank: index + 1 }));

    await dbClient.query(
      `
      UPDATE rooms
      SET status = 'completed', completed_at = NOW()
      WHERE id = $1
      `,
      [room.id]
    );

    await dbClient.query(
      `
      INSERT INTO game_results (room_id, quiz_id, rankings, winner_id)
      VALUES ($1, $2, $3::jsonb, $4)
      `,
      [room.id, room.quizId, JSON.stringify(rankings), rankings[0]?.user || null]
    );

    for (const ranking of rankings) {
      await dbClient.query(
        `
        UPDATE users
        SET total_score = total_score + $1,
            games_played = games_played + 1,
            games_won = games_won + $2
        WHERE id = $3
        `,
        [Number(ranking.score), ranking.rank === 1 ? 1 : 0, Number(ranking.user)]
      );
    }

    await dbClient.query("UPDATE quizzes SET times_played = times_played + 1 WHERE id = $1", [room.quizId]);

    await dbClient.query("COMMIT");
    return res.json({ message: "Game completed", rankings });
  } catch (error) {
    await dbClient.query("ROLLBACK");
    return res.status(500).json({ message: "Server error completing game" });
  } finally {
    dbClient.release();
  }
};

const getResults = async (req, res) => {
  try {
    const code = normalizeRoomCode(req.params.roomCode);

    const roomRows = await db
      .select({ id: rooms.id, roomCode: rooms.roomCode, name: rooms.name, status: rooms.status, players: rooms.players, quizId: rooms.quizId, quizTitle: quizzes.title, quizQuestions: quizzes.questions, hostId: rooms.hostId, createdAt: rooms.createdAt, startedAt: rooms.startedAt, completedAt: rooms.completedAt })
      .from(rooms)
      .innerJoin(quizzes, eq(quizzes.id, rooms.quizId))
      .where(eq(rooms.roomCode, code))
      .limit(1);

    if (roomRows.length === 0) {
      return res.status(404).json({ message: "Room not found" });
    }

    const room = roomRows[0];
    const players = Array.isArray(room.players) ? room.players.map(withDefaultPowerUps) : [];

    const userIds = players.map((p) => Number(p.user));
    userIds.push(Number(room.hostId));
    const userMap = await hydrateUsersByIds(userIds);

    const rankings = players
      .map((player) => {
        const correctAnswers = player.answers.filter((a) => a.isCorrect).length;
        const totalQuestions = Array.isArray(room.quizQuestions) ? room.quizQuestions.length : 0;
        const accuracy = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;

        return {
          user: userMap.get(Number(player.user)) || { id: Number(player.user), username: "Unknown", avatar: null },
          score: Number(player.score || 0),
          correctAnswers,
          totalQuestions,
          accuracy,
          answers: player.answers,
        };
      })
      .sort((a, b) => b.score - a.score)
      .map((player, index) => ({ ...player, rank: index + 1 }));

    const responseRoom = {
      id: room.id,
      roomCode: room.roomCode,
      name: room.name,
      status: room.status,
      createdAt: room.createdAt,
      startedAt: room.startedAt,
      completedAt: room.completedAt,
      quiz: {
        id: room.quizId,
        title: room.quizTitle,
        questions: room.quizQuestions,
      },
      host: userMap.get(Number(room.hostId)) || { id: Number(room.hostId), username: "Unknown", avatar: null },
      players: rankings.map((r) => ({
        user: r.user,
        score: r.score,
        answers: r.answers,
      })),
    };

    return res.json({ room: responseRoom, rankings });
  } catch (error) {
    return res.status(500).json({ message: "Server error fetching results", error: error.message });
  }
};

module.exports = {
  getAnswer,
  getcompleteGame,
  getResults,
};
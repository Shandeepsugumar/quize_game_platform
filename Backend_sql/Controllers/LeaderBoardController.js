const { db } = require("../db");
const { and, desc, eq, ilike, or, inArray, gt } = require("drizzle-orm");
const { users, quizzes, gameResults } = require("../Schema");


const getGlobalLeaderboard = async (req, res) => {
  try {
    const limit = Number(req.query.limit) || 10;
    const rows = await db
      .select({
        id: users.id,
        username: users.username,
        avatar: users.avatar,
        totalScore: users.totalScore,
        gamesPlayed: users.gamesPlayed,
        gamesWon: users.gamesWon,
      })
      .from(users)
      .orderBy(desc(users.totalScore))
      .limit(limit);

    const leaderboard = rows.map((user, index) => ({
      rank: index + 1,
      user: { id: user.id, username: user.username, avatar: user.avatar },
      totalScore: user.totalScore,
      gamesPlayed: user.gamesPlayed,
      gamesWon: user.gamesWon,
      winRate: user.gamesPlayed > 0 ? ((user.gamesWon / user.gamesPlayed) * 100).toFixed(1) : 0,
    }));

    return res.json({ leaderboard });
  } catch (error) {
    return res.status(500).json({ message: "Server error fetching leaderboard" });
  }
};

const getRecentLeaderboard = async (req, res) => {
  try {
    const limit = Number(req.query.limit) || 10;
    const rows = await db
      .select({
        id: gameResults.id,
        rankings: gameResults.rankings,
        playedAt: gameResults.playedAt,
        quiz_id: quizzes.id,
        quiz_title: quizzes.title,
        quiz_category: quizzes.category,
        quiz_difficulty: quizzes.difficulty,
        winner_id: gameResults.winnerId,
      })
      .from(gameResults)
      .innerJoin(quizzes, eq(quizzes.id, gameResults.quizId))
      .orderBy(desc(gameResults.playedAt))
      .limit(limit);

    const winnerIds = [...new Set(rows.map((r) => Number(r.winner_id)).filter(Boolean))];
    const rankUserIds = [...new Set(rows.flatMap((r) => (Array.isArray(r.rankings) ? r.rankings.map((x) => Number(x.user)) : [])).filter(Boolean))];
    const allIds = [...new Set([...winnerIds, ...rankUserIds])];

    let usersById = new Map();
    if (allIds.length > 0) {
      const usersRows = await db
        .select({ id: users.id, username: users.username, avatar: users.avatar })
        .from(users)
        .where(inArray(users.id, allIds));

      usersById = new Map(usersRows.map((u) => [Number(u.id), u]));
    }

    const recentGames = rows.map((row) => ({
      id: row.id,
      playedAt: row.playedAt,
      quiz: { id: row.quiz_id, title: row.quiz_title, category: row.quiz_category, difficulty: row.quiz_difficulty },
      rankings: (Array.isArray(row.rankings) ? row.rankings : []).map((ranking) => ({
        ...ranking,
        user: usersById.get(Number(ranking.user)) || { id: Number(ranking.user), username: "Unknown", avatar: null },
      })),
      winner: usersById.get(Number(row.winner_id)) || null,
    }));

    return res.json({ recentGames });
  } catch (error) {
    return res.status(500).json({ message: "Server error fetching recent games" });
  }
};

const getUserLeaderboard = async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    const usersFound = await db
      .select({ id: users.id, username: users.username, avatar: users.avatar, totalScore: users.totalScore, gamesPlayed: users.gamesPlayed, gamesWon: users.gamesWon })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (usersFound.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const user = usersFound[0];

    const higher = await db
      .select({ id: users.id })
      .from(users)
      .where(gt(users.totalScore, user.totalScore));
    const rank = higher.length + 1;

    const recentRows = await db
      .select({ id: gameResults.id, rankings: gameResults.rankings, playedAt: gameResults.playedAt, quiz_id: quizzes.id, quiz_title: quizzes.title, quiz_category: quizzes.category })
      .from(gameResults)
      .innerJoin(quizzes, eq(quizzes.id, gameResults.quizId))
      .orderBy(desc(gameResults.playedAt))
      .limit(50);

    const recentGamesFiltered = recentRows
      .filter((r) => Array.isArray(r.rankings) && r.rankings.some((elem) => Number(elem.user) === userId))
      .slice(0, 5)
      .map((g) => ({
        id: g.id,
        playedAt: g.playedAt,
        quiz: { id: g.quiz_id, title: g.quiz_title, category: g.quiz_category },
        rankings: g.rankings,
      }));

    const stats = {
      user: { id: user.id, username: user.username, avatar: user.avatar },
      rank,
      totalScore: user.totalScore,
      gamesPlayed: user.gamesPlayed,
      gamesWon: user.gamesWon,
      winRate: user.gamesPlayed > 0 ? ((user.gamesWon / user.gamesPlayed) * 100).toFixed(1) : 0,
      recentGames: recentGamesFiltered,
    };

    return res.json({ stats });
  } catch (error) {
    return res.status(500).json({ message: "Server error fetching user stats" });
  }
};

module.exports = {
  getGlobalLeaderboard,
  getRecentLeaderboard,
  getUserLeaderboard,
}
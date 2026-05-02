const jwt = require("jsonwebtoken");
const { client } = require("../db");

const JWT_SECRET = process.env.JWT_SECRET || "quiz-game-jwt-secret-2024";

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || "";
    const bearerToken = authHeader.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : null;
    const token = req.cookies?.token || bearerToken;

    if (!token) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const result = await client.query(
      `
      SELECT id, username, email, avatar, total_score AS "totalScore", games_played AS "gamesPlayed", games_won AS "gamesWon", created_at AS "createdAt"
      FROM users
      WHERE id = $1
      `,
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: "User not found" });
    }

    req.user = result.rows[0];
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

module.exports = authMiddleware;

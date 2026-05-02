const { db } = require("../db");
const { and, eq, ne, or } = require("drizzle-orm");
const { users } = require("../Schema");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { sanitizeUser } = require("../utils/helpers");

const JWT_SECRET = process.env.JWT_SECRET || "quiz-game-jwt-secret-2024";

const generateToken = (userId) => jwt.sign({ userId }, JWT_SECRET, { expiresIn: "7d" });

const registerUser = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (String(password).length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedUsername = username.trim();

    // Check if user already exists
    const existing = await db
      .select({ id: users.id, email: users.email, username: users.username })
      .from(users)
      .where(or(eq(users.email, trimmedEmail), eq(users.username, trimmedUsername)))
      .limit(1);

    if (existing.length > 0) {
      const found = existing[0];
      return res.status(400).json({
        message: found.email === trimmedEmail ? "Email already registered" : "Username already taken",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(trimmedUsername)}`;

    // Insert new user
    const created = await db.insert(users)
    .values({
        username: trimmedUsername,
        email: trimmedEmail,
        password: hashedPassword,
        avatar,
      })
    .returning({
        id: users.id,
        username: users.username,
        email: users.email,
        avatar: users.avatar,
        createdAt: users.createdAt,
        totalScore: users.totalScore,
        gamesPlayed: users.gamesPlayed,
        gamesWon: users.gamesWon,
      });

    const user = created[0];
    const token = generateToken(user.id);

    res.cookie("token", token, {
      httpOnly: true,
      secure: false,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(201).json({
      message: "Registration successful",
      token,
      user: sanitizeUser(user),
    });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(400).json({ message: "Email or username already exists" });
    }
    return res.status(500).json({ message: "Server error during registration", error: error.message });
  }
};

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    // Find user by email
    const result = await db
      .select()
      .from(users)
      .where(eq(users.email, email.trim().toLowerCase()))
      .limit(1);

    if (result.length === 0 || !result[0].password) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const user = result[0];
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = generateToken(user.id);

    res.cookie("token", token, {
      httpOnly: true,
      secure: false,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.json({
      message: "Login successful",
      token,
      user: sanitizeUser(user),
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error during login" });
  }
};

const googleAuth = async (req, res) => {
  try {
    const { googleId, email, username, avatar } = req.body;

    if (!googleId || !email) {
      return res.status(400).json({ message: "Google authentication data required" });
    }

    const trimmedEmail = email.trim().toLowerCase();
    const fallbackUsername = (username || email.split("@")[0]).trim();
    const fallbackAvatar = avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(email)}`;

    const existing = await db
      .select({
        id: users.id,
        username: users.username,
        email: users.email,
        avatar: users.avatar,
        googleId: users.googleId,
        totalScore: users.totalScore,
        gamesPlayed: users.gamesPlayed,
        gamesWon: users.gamesWon,
      })
      .from(users)
      .where(or(eq(users.googleId, googleId), eq(users.email, trimmedEmail)))
      .limit(1);

    let user;

    if (existing.length === 0) {
      const insertResult = await db
        .insert(users)
        .values({
          googleId,
          email: trimmedEmail,
          username: fallbackUsername,
          avatar: fallbackAvatar,
        })
        .returning({
          id: users.id,
          username: users.username,
          email: users.email,
          avatar: users.avatar,
          googleId: users.googleId,
          createdAt: users.createdAt,
          totalScore: users.totalScore,
          gamesPlayed: users.gamesPlayed,
          gamesWon: users.gamesWon,
        });

      user = insertResult[0];
    } else {
      user = existing[0];

      if (!user.googleId) {
        const updateResult = await db
          .update(users)
          .set({
            googleId,
            avatar: avatar || user.avatar,
          })
          .where(eq(users.id, user.id))
          .returning({
            id: users.id,
            username: users.username,
            email: users.email,
            avatar: users.avatar,
            googleId: users.googleId,
            createdAt: users.createdAt,
            totalScore: users.totalScore,
            gamesPlayed: users.gamesPlayed,
            gamesWon: users.gamesWon,
          });

        user = updateResult[0];
      }
    }

    const token = generateToken(user.id);

    res.cookie("token", token, {
      httpOnly: true,
      secure: false,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.json({
      message: "Google authentication successful",
      token,
      user: sanitizeUser(user),
    });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(400).json({ message: "Email or username already exists" });
    }
    return res.status(500).json({ message: "Server error during Google authentication" });
  }
};

const middleware = async (req, res) => {
  return res.json({ user: sanitizeUser(req.user) });
};

const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db
      .select()
      .from(users)
      .where(eq(users.id, Number(id)))
      .limit(1);

    if (result.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.status(200).json(sanitizeUser(result[0]));
  } catch (error) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

const updateUser = async (req, res) => {
  try {
    const { username, email, password, avatar } = req.body;
    const currentUserId = Number(req.user.id);
    const nextUsername = typeof username === "string" ? username.trim() : "";
    const nextEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
    const nextAvatar = typeof avatar === "string" ? avatar.trim() : "";

    if (!nextUsername && !nextEmail && !password && !nextAvatar) {
      return res.status(400).json({ message: "No profile fields provided" });
    }

    if (nextUsername && nextUsername.length === 0) {
      return res.status(400).json({ message: "Username cannot be empty" });
    }

    if (nextEmail && nextEmail.length === 0) {
      return res.status(400).json({ message: "Email cannot be empty" });
    }

    if (password && String(password).length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const conflictChecks = [];
    if (nextEmail) {
      conflictChecks.push(and(eq(users.email, nextEmail), ne(users.id, currentUserId)));
    }
    if (nextUsername) {
      conflictChecks.push(and(eq(users.username, nextUsername), ne(users.id, currentUserId)));
    }

    if (conflictChecks.length > 0) {
      const conflicts = await db
        .select({ id: users.id, email: users.email, username: users.username })
        .from(users)
        .where(or(...conflictChecks))
        .limit(1);

      if (conflicts.length > 0) {
        const conflict = conflicts[0];
        if (nextEmail && conflict.email === nextEmail) {
          return res.status(400).json({ message: "Email already exists" });
        }

        if (nextUsername && conflict.username === nextUsername) {
          return res.status(400).json({ message: "Username already taken" });
        }
      }
    }

    const updateData = {};
    if (nextUsername) updateData.username = nextUsername;
    if (nextEmail) updateData.email = nextEmail;
    if (nextAvatar) updateData.avatar = nextAvatar;
    if (password) updateData.password = await bcrypt.hash(String(password), 10);

    const result = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, currentUserId))
      .returning({
        id: users.id,
        username: users.username,
        email: users.email,
        avatar: users.avatar,
        createdAt: users.createdAt,
        totalScore: users.totalScore,
        gamesPlayed: users.gamesPlayed,
        gamesWon: users.gamesWon,
      });

    if (result.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json({
      message: "Profile updated successfully",
      user: sanitizeUser(result[0]),
    });
  } catch (error) {
    if (error.code === "23505") {
      if (String(error.constraint || "").includes("email")) {
        return res.status(400).json({ message: "Email already exists" });
      }

      if (String(error.constraint || "").includes("username")) {
        return res.status(400).json({ message: "Username already taken" });
      }

      return res.status(400).json({ message: "Profile data already exists" });
    }
    return res.status(500).json({ message: "Server error updating profile" });
  }
};

const logoutUser = (req, res) => {
  res.clearCookie("token");
  return res.json({ message: "Logout successful" });
};

const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db
      .delete(users)
      .where(eq(users.id, Number(id)))
      .returning();

    if (result.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.json({ message: "User deleted successfully" });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

module.exports = {
  registerUser,
  loginUser,
  googleAuth,
  middleware,
  getUserById,
  updateUser,
  deleteUser,
  logoutUser
};
const { db } = require("../db");
const { and, desc, eq, ilike, or } = require("drizzle-orm");
const { users, quizzes } = require("../Schema");

const mapQuizRow = (row) => ({
  id: row.id,
  title: row.title,
  description: row.description,
  category: row.category,
  difficulty: row.difficulty,
  questions: row.questions,
  createdBy: {
    id: row.creator_id,
    username: row.creator_username,
    avatar: row.creator_avatar,
  },
  isPublic: row.isPublic,
  timesPlayed: row.timesPlayed,
  createdAt: row.createdAt,
});

const CreateQuiz = async (req, res) => {
  try {
    const { title, description, category, difficulty, questions } = req.body;

    if (!title || !category || !difficulty || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ message: "All fields are required" });
    }

    for (const q of questions) {
      if (!q.question || !Array.isArray(q.options) || q.options.length !== 4 || q.correctAnswer === undefined) {
        return res.status(400).json({
          message: "Each question must have a question text, 4 options, and a correct answer",
        });
      }
    }

    const created = await db
      .insert(quizzes)
      .values({
        title,
        description: description || null,
        category,
        difficulty,
        questions,
        createdBy: Number(req.user.id),
      })
      .returning({
        id: quizzes.id,
        title: quizzes.title,
        description: quizzes.description,
        category: quizzes.category,
        difficulty: quizzes.difficulty,
        questions: quizzes.questions,
        creator_id: quizzes.createdBy,
        isPublic: quizzes.isPublic,
        timesPlayed: quizzes.timesPlayed,
        createdAt: quizzes.createdAt,
      });

    const quiz = mapQuizRow({
      ...created[0],
      creator_username: req.user.username,
      creator_avatar: req.user.avatar,
    });

    return res.status(201).json({
      message: "Quiz created successfully",
      quiz,
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error creating quiz" });
  }
};

const AllQuiz = async (req, res) => {
  try {
    const { category, difficulty, search } = req.query;
    const filters = [eq(quizzes.isPublic, true)];

    if (category && category !== "All") {
      filters.push(eq(quizzes.category, category));
    }

    if (difficulty && difficulty !== "All") {
      filters.push(eq(quizzes.difficulty, difficulty));
    }

    if (search) {
      const query = `%${search}%`;
      filters.push(
        or(
          ilike(quizzes.title, query),
          ilike(quizzes.description, query)
        )
      );
    }

    const result = await db
      .select({
        id: quizzes.id,
        title: quizzes.title,
        description: quizzes.description,
        category: quizzes.category,
        difficulty: quizzes.difficulty,
        questions: quizzes.questions,
        isPublic: quizzes.isPublic,
        timesPlayed: quizzes.timesPlayed,
        createdAt: quizzes.createdAt,
        creator_id: users.id,
        creator_username: users.username,
        creator_avatar: users.avatar,
      })
      .from(quizzes)
      .innerJoin(users, eq(users.id, quizzes.createdBy))
      .where(and(...filters))
      .orderBy(desc(quizzes.createdAt));

    return res.json({ quizzes: result.map(mapQuizRow) });
  } catch (error) {
    return res.status(500).json({ message: "Server error fetching quizzes" });
  }
};

const MyQuizzes = async (req, res) => {
  try {
    const result = await db
      .select({
        id: quizzes.id,
        title: quizzes.title,
        description: quizzes.description,
        category: quizzes.category,
        difficulty: quizzes.difficulty,
        questions: quizzes.questions,
        isPublic: quizzes.isPublic,
        timesPlayed: quizzes.timesPlayed,
        createdAt: quizzes.createdAt,
        creator_id: users.id,
        creator_username: users.username,
        creator_avatar: users.avatar,
      })
      .from(quizzes)
      .innerJoin(users, eq(users.id, quizzes.createdBy))
      .where(eq(quizzes.createdBy, Number(req.user.id)))
      .orderBy(desc(quizzes.createdAt));

    return res.json({ quizzes: result.map(mapQuizRow) });
  } catch (error) {
    return res.status(500).json({ message: "Server error fetching quizzes" });
  }
};

const GetQuizById = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: "Invalid quiz id" });
    }

    const result = await db
      .select({
        id: quizzes.id,
        title: quizzes.title,
        description: quizzes.description,
        category: quizzes.category,
        difficulty: quizzes.difficulty,
        questions: quizzes.questions,
        isPublic: quizzes.isPublic,
        timesPlayed: quizzes.timesPlayed,
        createdAt: quizzes.createdAt,
        creator_id: users.id,
        creator_username: users.username,
        creator_avatar: users.avatar,
      })
      .from(quizzes)
      .innerJoin(users, eq(users.id, quizzes.createdBy))
      .where(eq(quizzes.id, id))
      .limit(1);

    if (result.length === 0) {
      return res.status(404).json({ message: "Quiz not found" });
    }

    return res.json({ quiz: mapQuizRow(result[0]) });
  } catch (error) {
    return res.status(500).json({ message: "Server error fetching quiz" });
  }
};

const DeleteQuiz = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: "Invalid quiz id" });
    }

    const deleted = await db
      .delete(quizzes)
      .where(and(eq(quizzes.id, id), eq(quizzes.createdBy, Number(req.user.id))))
      .returning({ id: quizzes.id });

    if (deleted.length === 0) {
      const exists = await db
        .select({ id: quizzes.id })
        .from(quizzes)
        .where(eq(quizzes.id, id))
        .limit(1);

      if (exists.length === 0) {
        return res.status(404).json({ message: "Quiz not found" });
      }

      return res.status(403).json({ message: "Not authorized to delete this quiz" });
    }

    return res.json({ message: "Quiz deleted successfully" });
  } catch (error) {
    return res.status(500).json({ message: "Server error deleting quiz" });
  }
};

module.exports = {
  CreateQuiz,
  AllQuiz,
  MyQuizzes,
  GetQuizById,
  DeleteQuiz
};


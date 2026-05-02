const express = require("express");
const { client } = require("../db");
const authMiddleware = require("../middleware/auth");
const { CreateQuiz, AllQuiz, MyQuizzes, GetQuizById, DeleteQuiz} = require("../Controllers/QuizController");

const router = express.Router();

router.post("/create", authMiddleware, CreateQuiz);

router.get("/all", AllQuiz);

router.get("/my/quizzes", authMiddleware, MyQuizzes);

router.get("/:id", GetQuizById);

router.delete("/:id", authMiddleware, DeleteQuiz);

module.exports = router;

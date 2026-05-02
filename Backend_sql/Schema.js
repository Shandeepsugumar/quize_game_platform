const {
    pgTable,
    serial,
    text,
    varchar,
    integer,
    timestamp,
    boolean,
    jsonb,
} = require("drizzle-orm/pg-core");

const users = pgTable("users", {
    id: serial("id").primaryKey(),
    username: varchar("username", { length: 255 }).notNull().unique(),
    email: varchar("email", { length: 255 }).notNull().unique(),
    password: text("password"),
    googleId: varchar("google_id", { length: 255 }).unique(),
    avatar: text("avatar")
        .notNull()
        .default("https://api.dicebear.com/7.x/avataaars/svg?seed=default"),
    totalScore: integer("total_score").notNull().default(0),
    gamesPlayed: integer("games_played").notNull().default(0),
    gamesWon: integer("games_won").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

const quizzes = pgTable("quizzes", {
    id: serial("id").primaryKey(),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description"),
    category: varchar("category", { length: 120 }).notNull(),
    difficulty: varchar("difficulty", { length: 20 }).notNull(),
    questions: jsonb("questions").notNull().default([]),
    createdBy: integer("created_by")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    isPublic: boolean("is_public").notNull().default(true),
    timesPlayed: integer("times_played").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

const rooms = pgTable("rooms", {
    id: serial("id").primaryKey(),
    roomCode: varchar("room_code", { length: 6 }).notNull().unique(),
    name: varchar("name", { length: 255 }).notNull(),
    quizId: integer("quiz_id")
        .notNull()
        .references(() => quizzes.id, { onDelete: "cascade" }),
    hostId: integer("host_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    players: jsonb("players").notNull().default([]),
    maxPlayers: integer("max_players").notNull().default(10),
    status: varchar("status", { length: 20 }).notNull().default("waiting"),
    powerUpsEnabled: boolean("power_ups_enabled").notNull().default(false),
    currentQuestion: integer("current_question").notNull().default(0),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

const gameResults = pgTable("game_results", {
    id: serial("id").primaryKey(),
    roomId: integer("room_id")
        .notNull()
        .references(() => rooms.id, { onDelete: "cascade" }),
    quizId: integer("quiz_id")
        .notNull()
        .references(() => quizzes.id, { onDelete: "cascade" }),
    rankings: jsonb("rankings").notNull().default([]),
    winnerId: integer("winner_id").references(() => users.id, { onDelete: "set null" }),
    playedAt: timestamp("played_at", { withTimezone: true }).notNull().defaultNow(),
});

module.exports = {
    users,
    quizzes,
    rooms,
    gameResults,
};
CREATE TABLE "Users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"password" text NOT NULL,
	"totalScore" integer DEFAULT 0,
	"gamesPlayed" integer DEFAULT 0,
	"gamesWon" integer DEFAULT 0,
	"createdAt" timestamp DEFAULT now(),
	CONSTRAINT "Users_email_unique" UNIQUE("email")
);

const normalizeRoomCode = (roomCode) => String(roomCode || "").trim().toUpperCase();

const generateRoomCode = () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 6; i += 1) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

const sanitizeUser = (user) => ({
  id: user.id,
  username: user.username,
  email: user.email,
  avatar: user.avatar,
  totalScore: user.totalScore,
  gamesPlayed: user.gamesPlayed,
  gamesWon: user.gamesWon,
  createdAt: user.createdAt,
});

const withDefaultPowerUps = (player) => ({
  ...player,
  powerUps: player.powerUps || {
    doublePoints: 2,
    freezeTime: 2,
    skipQuestion: 1,
  },
  answers: Array.isArray(player.answers) ? player.answers : [],
  score: Number(player.score || 0),
});

module.exports = {
  normalizeRoomCode,
  generateRoomCode,
  sanitizeUser,
  withDefaultPowerUps,
};

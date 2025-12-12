import axios from 'axios';

const API_URL = 'https://quize-game-platform.onrender.com/api';

const api = axios.create({
    baseURL: API_URL,
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Add token to requests
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Auth API
export const authAPI = {
    register: (data) => api.post('/auth/register', data),
    login: (data) => api.post('/auth/login', data),
    googleAuth: (data) => api.post('/auth/google', data),
    getCurrentUser: () => api.get('/auth/me'),
    logout: () => api.post('/auth/logout')
};

// Quiz API
export const quizAPI = {
    createQuiz: (data) => api.post('/quiz/create', data),
    getAllQuizzes: (params) => api.get('/quiz/all', { params }),
    getQuizById: (id) => api.get(`/quiz/${id}`),
    getMyQuizzes: () => api.get('/quiz/my/quizzes'),
    deleteQuiz: (id) => api.delete(`/quiz/${id}`)
};

// Room API
export const roomAPI = {
    createRoom: (data) => api.post('/room/create', data),
    joinRoom: (data) => api.post('/room/join', data),
    getRoom: (roomCode) => api.get(`/room/${roomCode}`),
    startGame: (roomCode) => api.post(`/room/${roomCode}/start`),
    togglePowerUps: (roomCode, powerUpsEnabled) => api.post(`/room/${roomCode}/toggle-powerups`, { powerUpsEnabled }),
    getActiveRooms: () => api.get('/room/active/all')
};

// Game API
export const gameAPI = {
    submitAnswer: (data) => api.post('/game/answer', data),
    completeGame: (data) => api.post('/game/complete', data),
    getResults: (roomCode) => api.get(`/game/results/${roomCode}`)
};

// Leaderboard API
export const leaderboardAPI = {
    getGlobalLeaderboard: (limit = 10) => api.get('/leaderboard/global', { params: { limit } }),
    getRecentGames: (limit = 10) => api.get('/leaderboard/recent', { params: { limit } }),
    getUserStats: (userId) => api.get(`/leaderboard/user/${userId}`)
};

export default api;

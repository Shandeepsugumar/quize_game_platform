import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { quizAPI, roomAPI, leaderboardAPI } from '../services/api';
import './Dashboard.css';

const Dashboard = () => {
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const [activeTab, setActiveTab] = useState('browse');
    const [quizzes, setQuizzes] = useState([]);
    const [activeRooms, setActiveRooms] = useState([]);
    const [leaderboard, setLeaderboard] = useState([]);
    const [myQuizzes, setMyQuizzes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [filters, setFilters] = useState({
        category: 'All',
        difficulty: 'All',
        search: ''
    });

    useEffect(() => {
        loadData();
    }, [activeTab, filters]);

    const loadData = async () => {
        setLoading(true);
        try {
            if (activeTab === 'browse') {
                const response = await quizAPI.getAllQuizzes(filters);
                setQuizzes(response.data.quizzes);
            } else if (activeTab === 'rooms') {
                const response = await roomAPI.getActiveRooms();
                setActiveRooms(response.data.rooms);
            } else if (activeTab === 'leaderboard') {
                const response = await leaderboardAPI.getGlobalLeaderboard(10);
                setLeaderboard(response.data.leaderboard);
            } else if (activeTab === 'myquizzes') {
                const response = await quizAPI.getMyQuizzes();
                setMyQuizzes(response.data.quizzes);
            }
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateRoom = async (quizId) => {
        try {
            const response = await roomAPI.createRoom({
                name: `${user.username}'s Room`,
                quizId,
                maxPlayers: 100
            });
            navigate(`/room/${response.data.room.roomCode}`);
        } catch (error) {
            console.error('Error creating room:', error);
            alert('Failed to create room');
        }
    };

    const handleJoinRoom = (roomCode) => {
        navigate(`/room/${roomCode}`);
    };

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    return (
        <div className="dashboard">
            <header className="dashboard-header">
                <div className="container">
                    <div className="header-content">
                        <div className="logo">
                            <h2>🎯 QuizMaster</h2>
                        </div>
                        <div className="user-menu">
                            <div className="user-info">
                                <img src={user?.avatar} alt={user?.username} className="user-avatar" />
                                <div>
                                    <p className="user-name">{user?.username}</p>
                                    <p className="user-score">Score: {user?.totalScore || 0}</p>
                                </div>
                            </div>
                            <button onClick={handleLogout} className="btn btn-outline">
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <nav className="dashboard-nav">
                <div className="container">
                    <div className="nav-tabs">
                        <button
                            className={`nav-tab ${activeTab === 'browse' ? 'active' : ''}`}
                            onClick={() => setActiveTab('browse')}
                        >
                            Browse Quizzes
                        </button>
                        <button
                            className={`nav-tab ${activeTab === 'rooms' ? 'active' : ''}`}
                            onClick={() => setActiveTab('rooms')}
                        >
                            Active Rooms
                        </button>
                        <button
                            className={`nav-tab ${activeTab === 'leaderboard' ? 'active' : ''}`}
                            onClick={() => setActiveTab('leaderboard')}
                        >
                            Leaderboard
                        </button>
                        <button
                            className={`nav-tab ${activeTab === 'myquizzes' ? 'active' : ''}`}
                            onClick={() => setActiveTab('myquizzes')}
                        >
                            My Quizzes
                        </button>
                        <button
                            className="btn btn-primary"
                            onClick={() => navigate('/create-quiz')}
                        >
                            + Create Quiz
                        </button>
                    </div>
                </div>
            </nav>

            <main className="dashboard-content">
                <div className="container">
                    {activeTab === 'browse' && (
                        <div className="tab-content fade-in">
                            <div className="filters">
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="Search quizzes..."
                                    value={filters.search}
                                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                                />
                                <select
                                    className="form-select"
                                    value={filters.category}
                                    onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                                >
                                    <option>All</option>
                                    <option>General Knowledge</option>
                                    <option>Science</option>
                                    <option>History</option>
                                    <option>Geography</option>
                                    <option>Sports</option>
                                    <option>Entertainment</option>
                                    <option>Technology</option>
                                    <option>Mathematics</option>
                                </select>
                                <select
                                    className="form-select"
                                    value={filters.difficulty}
                                    onChange={(e) => setFilters({ ...filters, difficulty: e.target.value })}
                                >
                                    <option>All</option>
                                    <option>Easy</option>
                                    <option>Medium</option>
                                    <option>Hard</option>
                                </select>
                            </div>

                            {loading ? (
                                <div className="loading-container">
                                    <div className="spinner"></div>
                                </div>
                            ) : (
                                <div className="quiz-grid">
                                    {quizzes.map((quiz) => (
                                        <div key={quiz._id} className="quiz-card card">
                                            <div className="quiz-header">
                                                <h3>{quiz.title}</h3>
                                                <span className={`badge badge-${quiz.difficulty.toLowerCase()}`}>
                                                    {quiz.difficulty}
                                                </span>
                                            </div>
                                            <p className="quiz-description">{quiz.description}</p>
                                            <div className="quiz-meta">
                                                <span className="meta-item">
                                                    📚 {quiz.category}
                                                </span>
                                                <span className="meta-item">
                                                    ❓ {quiz.questions.length} Questions
                                                </span>
                                                <span className="meta-item">
                                                    🎮 {quiz.timesPlayed || 0} Plays
                                                </span>
                                            </div>
                                            <div className="quiz-footer">
                                                <div className="creator-info">
                                                    <img src={quiz.createdBy?.avatar} alt="" className="creator-avatar" />
                                                    <span>{quiz.createdBy?.username}</span>
                                                </div>
                                                <button
                                                    className="btn btn-primary"
                                                    onClick={() => handleCreateRoom(quiz._id)}
                                                >
                                                    Create Room
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'rooms' && (
                        <div className="tab-content fade-in">
                            <div className="room-join-section">
                                <h3>Join a Room</h3>
                                <div className="join-room-form">
                                    <input
                                        type="text"
                                        className="form-input"
                                        placeholder="Enter Room Code"
                                        id="roomCodeInput"
                                        maxLength={6}
                                        style={{ textTransform: 'uppercase' }}
                                    />
                                    <button
                                        className="btn btn-primary"
                                        onClick={() => {
                                            const code = document.getElementById('roomCodeInput').value;
                                            if (code) handleJoinRoom(code);
                                        }}
                                    >
                                        Join Room
                                    </button>
                                </div>
                            </div>

                            <h3 className="mt-4">Active Rooms</h3>
                            {loading ? (
                                <div className="loading-container">
                                    <div className="spinner"></div>
                                </div>
                            ) : (
                                <div className="rooms-grid">
                                    {activeRooms.map((room) => (
                                        <div key={room._id} className="room-card card">
                                            <div className="room-header">
                                                <h4>{room.name}</h4>
                                                <span className="room-code">{room.roomCode}</span>
                                            </div>
                                            <p className="room-quiz">{room.quiz?.title}</p>
                                            <div className="room-info">
                                                <span>👥 {room.players.length}/{room.maxPlayers}</span>
                                                <span>Host: {room.host?.username}</span>
                                            </div>
                                            <button
                                                className="btn btn-secondary btn-block"
                                                onClick={() => handleJoinRoom(room.roomCode)}
                                                disabled={room.players.length >= room.maxPlayers}
                                            >
                                                {room.players.length >= room.maxPlayers ? 'Full' : 'Join Room'}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'leaderboard' && (
                        <div className="tab-content fade-in">
                            <h2 className="text-center mb-4">🏆 Global Leaderboard</h2>
                            {loading ? (
                                <div className="loading-container">
                                    <div className="spinner"></div>
                                </div>
                            ) : (
                                <div className="leaderboard-container">
                                    {leaderboard.map((entry, index) => (
                                        <div
                                            key={entry.user.id}
                                            className={`leaderboard-item ${index === 0 ? 'rank-1' : index === 1 ? 'rank-2' : index === 2 ? 'rank-3' : ''
                                                }`}
                                        >
                                            <div className="rank-badge">
                                                {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${entry.rank}`}
                                            </div>
                                            <img src={entry.user.avatar} alt="" className="leaderboard-avatar" />
                                            <div className="leaderboard-info">
                                                <h4>{entry.user.username}</h4>
                                                <p className="text-muted">
                                                    {entry.gamesPlayed} games • {entry.winRate}% win rate
                                                </p>
                                            </div>
                                            <div className="leaderboard-score">
                                                <span className="score-value">{entry.totalScore}</span>
                                                <span className="score-label">points</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'myquizzes' && (
                        <div className="tab-content fade-in">
                            <div className="flex-between mb-4">
                                <h2>My Quizzes</h2>
                                <button className="btn btn-primary" onClick={() => navigate('/create-quiz')}>
                                    + Create New Quiz
                                </button>
                            </div>
                            {loading ? (
                                <div className="loading-container">
                                    <div className="spinner"></div>
                                </div>
                            ) : myQuizzes.length === 0 ? (
                                <div className="empty-state">
                                    <p>You haven't created any quizzes yet.</p>
                                    <button className="btn btn-primary mt-3" onClick={() => navigate('/create-quiz')}>
                                        Create Your First Quiz
                                    </button>
                                </div>
                            ) : (
                                <div className="quiz-grid">
                                    {myQuizzes.map((quiz) => (
                                        <div key={quiz._id} className="quiz-card card">
                                            <div className="quiz-header">
                                                <h3>{quiz.title}</h3>
                                                <span className={`badge badge-${quiz.difficulty.toLowerCase()}`}>
                                                    {quiz.difficulty}
                                                </span>
                                            </div>
                                            <p className="quiz-description">{quiz.description}</p>
                                            <div className="quiz-meta">
                                                <span className="meta-item">📚 {quiz.category}</span>
                                                <span className="meta-item">❓ {quiz.questions.length} Questions</span>
                                                <span className="meta-item">🎮 {quiz.timesPlayed || 0} Plays</span>
                                            </div>
                                            <div className="quiz-actions">
                                                <button
                                                    className="btn btn-primary"
                                                    onClick={() => handleCreateRoom(quiz._id)}
                                                >
                                                    Create Room
                                                </button>
                                                <button
                                                    className="btn btn-outline"
                                                    onClick={async () => {
                                                        if (confirm('Delete this quiz?')) {
                                                            await quizAPI.deleteQuiz(quiz._id);
                                                            loadData();
                                                        }
                                                    }}
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default Dashboard;

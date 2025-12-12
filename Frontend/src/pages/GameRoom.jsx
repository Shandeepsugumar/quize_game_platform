import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { roomAPI, gameAPI } from '../services/api';
import './GameRoom.css';

const GameRoom = () => {
    const { roomCode } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [room, setRoom] = useState(null);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [selectedAnswer, setSelectedAnswer] = useState(null);
    const [timeLeft, setTimeLeft] = useState(30);
    const [showResult, setShowResult] = useState(false);
    const [answerResult, setAnswerResult] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Player setup states
    const [showPlayerSetup, setShowPlayerSetup] = useState(false);
    const [displayName, setDisplayName] = useState(user?.username || '');
    const [selectedAvatar, setSelectedAvatar] = useState(user?.avatar || '');

    // Host mode states
    const [showHostModeSelection, setShowHostModeSelection] = useState(false);
    const [hostMode, setHostMode] = useState(null); // 'play' or 'inspect'

    // Power-up states
    const [powerUps, setPowerUps] = useState({
        doublePoints: 2,
        freezeTime: 2,
        skipQuestion: 1
    });
    const [activePowerUp, setActivePowerUp] = useState(null);
    const [powerUpCooldowns, setPowerUpCooldowns] = useState({
        doublePoints: false,
        freezeTime: false,
        skipQuestion: false
    });
    const [timeFrozen, setTimeFrozen] = useState(false);

    // Avatar options
    const avatarOptions = [
        'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
        'https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka',
        'https://api.dicebear.com/7.x/avataaars/svg?seed=Luna',
        'https://api.dicebear.com/7.x/avataaars/svg?seed=Max',
        'https://api.dicebear.com/7.x/avataaars/svg?seed=Sophie',
        'https://api.dicebear.com/7.x/avataaars/svg?seed=Charlie',
        'https://api.dicebear.com/7.x/avataaars/svg?seed=Bella',
        'https://api.dicebear.com/7.x/avataaars/svg?seed=Rocky',
        'https://api.dicebear.com/7.x/avataaars/svg?seed=Milo',
        'https://api.dicebear.com/7.x/avataaars/svg?seed=Zoe',
        'https://api.dicebear.com/7.x/avataaars/svg?seed=Leo',
        'https://api.dicebear.com/7.x/avataaars/svg?seed=Lily'
    ];

    useEffect(() => {
        loadRoom();
    }, [roomCode]);

    // Check if host should see mode selection
    useEffect(() => {
        if (room && room.host._id === user?.id && room.status === 'waiting' && !hostMode) {
            setShowHostModeSelection(true);
        }
    }, [room, user]);

    useEffect(() => {
        if (room?.status === 'in-progress' && timeLeft > 0 && !selectedAnswer && !timeFrozen) {
            const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
            return () => clearTimeout(timer);
        } else if (timeLeft === 0 && !selectedAnswer) {
            handleSubmitAnswer(null);
        }
    }, [timeLeft, room, selectedAnswer, timeFrozen]);

    const loadRoom = async () => {
        try {
            const response = await roomAPI.getRoom(roomCode);
            setRoom(response.data.room);

            if (response.data.room.status === 'in-progress') {
                const question = response.data.room.quiz.questions[currentQuestionIndex];
                setTimeLeft(question?.timeLimit || 30);
            }
        } catch (err) {
            setError('Room not found');
        } finally {
            setLoading(false);
        }
    };

    const showPlayerSetupModal = () => {
        setShowPlayerSetup(true);
    };

    const handlePlayerSetupComplete = async () => {
        if (!displayName.trim()) {
            alert('Please enter a display name');
            return;
        }

        try {
            // Update user profile with new name and avatar
            await fetch('https://quize-game-platform.onrender.com/api/auth/update-profile', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    username: displayName,
                    avatar: selectedAvatar
                })
            });

            // Join the room
            await roomAPI.joinRoom({ roomCode });
            setShowPlayerSetup(false);
            loadRoom();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to join room');
        }
    };

    const handleJoinRoom = () => {
        showPlayerSetupModal();
    };

    const handleHostModeSelect = async (mode) => {
        setHostMode(mode);
        setShowHostModeSelection(false);

        if (mode === 'play') {
            // Host wants to play, show player setup
            setShowPlayerSetup(true);
        }
        // If mode is 'inspect', host just watches
    };

    const handleHostPlayerSetup = async () => {
        if (!displayName.trim()) {
            alert('Please enter a display name');
            return;
        }

        try {
            // Update host profile
            await fetch('https://quize-game-platform.onrender.com/api/auth/update-profile', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    username: displayName,
                    avatar: selectedAvatar
                })
            });

            setShowPlayerSetup(false);
            loadRoom();
        } catch (err) {
            setError('Failed to update profile');
        }
    };

    const handleStartGame = async () => {
        try {
            await roomAPI.startGame(roomCode);
            loadRoom();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to start game');
        }
    };

    const handleTogglePowerUps = async (enabled) => {
        try {
            await roomAPI.togglePowerUps(roomCode, enabled);
            loadRoom(); // Refresh room data
        } catch (err) {
            console.error('Error toggling power-ups:', err);
            setError('Failed to toggle power-ups');
        }
    };

    const handleEndGame = async () => {
        if (!confirm('Are you sure you want to end the game? This will show the current results.')) {
            return;
        }

        try {
            await gameAPI.completeGame({ roomCode });
            navigate(`/results/${roomCode}`);
        } catch (err) {
            console.error('Error ending game:', err);
            setError('Failed to end game');
        }
    };

    // Power-Up Handlers
    const usePowerUp = (powerUpType) => {
        if (powerUps[powerUpType] <= 0 || powerUpCooldowns[powerUpType]) {
            return;
        }

        // Set cooldown
        setPowerUpCooldowns(prev => ({ ...prev, [powerUpType]: true }));

        // Apply power-up effect
        if (powerUpType === 'doublePoints') {
            setActivePowerUp('doublePoints');
            // Cooldown: 3 seconds
            setTimeout(() => {
                setPowerUpCooldowns(prev => ({ ...prev, doublePoints: false }));
            }, 3000);
        } else if (powerUpType === 'freezeTime') {
            setTimeFrozen(true);
            // Freeze for 10 seconds
            setTimeout(() => {
                setTimeFrozen(false);
                setPowerUpCooldowns(prev => ({ ...prev, freezeTime: false }));
            }, 10000);
        } else if (powerUpType === 'skipQuestion') {
            // Skip to next question
            skipToNextQuestion();
            // Cooldown: 2 seconds
            setTimeout(() => {
                setPowerUpCooldowns(prev => ({ ...prev, skipQuestion: false }));
            }, 2000);
        }

        // Decrease power-up count
        setPowerUps(prev => ({
            ...prev,
            [powerUpType]: prev[powerUpType] - 1
        }));
    };

    const skipToNextQuestion = () => {
        if (currentQuestionIndex < room.quiz.questions.length - 1) {
            setCurrentQuestionIndex(currentQuestionIndex + 1);
            setSelectedAnswer(null);
            setShowResult(false);
            setAnswerResult(null);
            setActivePowerUp(null);
            setTimeLeft(room.quiz.questions[currentQuestionIndex + 1].timeLimit);
        } else {
            // Last question, complete game
            if (room.host._id === user.id) {
                completeGame();
            } else {
                navigate(`/results/${roomCode}`);
            }
        }
    };

    const handleSelectAnswer = (answerIndex) => {
        if (selectedAnswer === null && timeLeft > 0) {
            setSelectedAnswer(answerIndex);
            handleSubmitAnswer(answerIndex);
        }
    };

    const handleSubmitAnswer = async (answer) => {
        const question = room.quiz.questions[currentQuestionIndex];
        const timeSpent = question.timeLimit - timeLeft;

        try {
            const response = await gameAPI.submitAnswer({
                roomCode,
                questionIndex: currentQuestionIndex,
                selectedAnswer: answer !== null ? answer : -1,
                timeSpent,
                powerUpUsed: activePowerUp
            });

            setAnswerResult(response.data);
            setShowResult(true);

            // Reload room to get updated scores for leaderboard
            await loadRoom();

            setTimeout(() => {
                if (currentQuestionIndex < room.quiz.questions.length - 1) {
                    setCurrentQuestionIndex(currentQuestionIndex + 1);
                    setSelectedAnswer(null);
                    setShowResult(false);
                    setAnswerResult(null);
                    setActivePowerUp(null);
                    setTimeLeft(room.quiz.questions[currentQuestionIndex + 1].timeLimit);
                } else {
                    if (room.host._id === user.id) {
                        completeGame();
                    } else {
                        navigate(`/results/${roomCode}`);
                    }
                }
            }, 3000);
        } catch (err) {
            console.error('Error submitting answer:', err);
        }
    };

    const completeGame = async () => {
        try {
            await gameAPI.completeGame({ roomCode });
            navigate(`/results/${roomCode}`);
        } catch (err) {
            console.error('Error completing game:', err);
        }
    };

    if (loading) {
        return (
            <div className="game-room-container">
                <div className="loading-container">
                    <div className="spinner"></div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="game-room-container">
                <div className="error-container">
                    <h2>{error}</h2>
                    <button onClick={() => navigate('/dashboard')} className="btn btn-primary">
                        Back to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    const isHost = room?.host._id === user?.id;
    const isPlayerInRoom = room?.players.some(p => p.user._id === user?.id);

    return (
        <div className="game-room-container">
            {/* Host Mode Selection Modal */}
            {showHostModeSelection && (
                <div className="modal-overlay">
                    <div className="modal-content host-mode-modal">
                        <h2>🎯 Choose Your Role</h2>
                        <p className="modal-subtitle">How would you like to participate in this game?</p>

                        <div className="mode-options">
                            <div
                                className="mode-option"
                                onClick={() => handleHostModeSelect('play')}
                            >
                                <div className="mode-icon">🎮</div>
                                <h3>Play</h3>
                                <p>Join the game and compete with other players</p>
                            </div>

                            <div
                                className="mode-option"
                                onClick={() => handleHostModeSelect('inspect')}
                            >
                                <div className="mode-icon">👁️</div>
                                <h3>Inspect</h3>
                                <p>Watch the game and manage as host only</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Player Setup Modal */}
            {showPlayerSetup && (
                <div className="modal-overlay">
                    <div className="modal-content player-setup-modal">
                        <h2>🎮 Setup Your Player</h2>
                        <p className="modal-subtitle">Customize your name and avatar before joining!</p>

                        <div className="setup-section">
                            <label className="setup-label">Display Name</label>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="Enter your name"
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                                maxLength={20}
                            />
                        </div>

                        <div className="setup-section">
                            <label className="setup-label">Choose Your Avatar</label>
                            <div className="avatar-grid">
                                {avatarOptions.map((avatar, index) => (
                                    <div
                                        key={index}
                                        className={`avatar-option ${selectedAvatar === avatar ? 'selected' : ''}`}
                                        onClick={() => setSelectedAvatar(avatar)}
                                    >
                                        <img src={avatar} alt={`Avatar ${index + 1}`} />
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="modal-actions">
                            <button
                                onClick={() => setShowPlayerSetup(false)}
                                className="btn btn-outline"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={isHost ? handleHostPlayerSetup : handlePlayerSetupComplete}
                                className="btn btn-primary"
                            >
                                {isHost ? 'Continue' : 'Join Game'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="container">
                {room?.status === 'waiting' && (
                    <div className="waiting-lobby fade-in">
                        <div className="lobby-header card">
                            <div className="room-info-header">
                                <h1>{room.name}</h1>
                                <div className="room-code-display">
                                    <span className="label">Room Code:</span>
                                    <span className="code">{room.roomCode}</span>
                                </div>
                            </div>
                            <div className="quiz-info">
                                <h3>{room.quiz.title}</h3>
                                <div className="quiz-details">
                                    <span className={`badge badge-${(room.quiz.difficulty || 'medium').toLowerCase()}`}>
                                        {room.quiz.difficulty || 'Medium'}
                                    </span>
                                    <span>📚 {room.quiz.category || 'General'}</span>
                                    <span>❓ {room.quiz.questions?.length || 0} Questions</span>
                                </div>
                            </div>
                        </div>

                        <div className="players-section card">
                            <h2>Players ({room.players.length}/{room.maxPlayers})</h2>
                            <div className="players-grid">
                                {room.players.map((player) => (
                                    <div key={player.user._id} className="player-card">
                                        <img src={player.user.avatar} alt="" className="player-avatar" />
                                        <div className="player-info">
                                            <p className="player-name">{player.user.username}</p>
                                            {player.user._id === room.host._id && (
                                                <span className="host-badge">Host</span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Power-Ups Settings (Host Only) */}
                        {isHost && (
                            <div className="power-ups-settings card">
                                <h3>⚡ Game Settings</h3>
                                <div className="setting-item">
                                    <div className="setting-info">
                                        <label className="setting-label">Enable Power-Ups</label>
                                        <p className="setting-description">
                                            Allow players to use special abilities during the game
                                        </p>
                                    </div>
                                    <label className="toggle-switch">
                                        <input
                                            type="checkbox"
                                            checked={room.powerUpsEnabled || false}
                                            onChange={(e) => handleTogglePowerUps(e.target.checked)}
                                        />
                                        <span className="toggle-slider"></span>
                                    </label>
                                </div>
                                {room.powerUpsEnabled && (
                                    <div className="power-ups-info">
                                        <p className="info-title">Available Power-Ups:</p>
                                        <ul className="power-ups-list">
                                            <li>💎 <strong>Double Points</strong> - 2x points for one question (2 uses)</li>
                                            <li>⏸️ <strong>Freeze Time</strong> - Stop the timer for 10 seconds (2 uses)</li>
                                            <li>⏭️ <strong>Skip Question</strong> - Skip without penalty (1 use)</li>
                                        </ul>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="lobby-actions">
                            {!isPlayerInRoom && (
                                <button onClick={handleJoinRoom} className="btn btn-primary btn-lg">
                                    Join Room
                                </button>
                            )}
                            {isHost && (
                                <button
                                    onClick={handleStartGame}
                                    className="btn btn-success btn-lg"
                                    disabled={room.players.length < 1}
                                >
                                    Start Game
                                </button>
                            )}
                            {!isHost && isPlayerInRoom && (
                                <p className="waiting-message">Waiting for host to start the game...</p>
                            )}
                        </div>
                    </div>
                )}

                {room?.status === 'in-progress' && (
                    <div className="game-screen fade-in">
                        <div className="game-header">
                            <div className="progress-bar">
                                <div
                                    className="progress-fill"
                                    style={{
                                        width: `${((currentQuestionIndex + 1) / room.quiz.questions.length) * 100}%`
                                    }}
                                />
                            </div>
                            <div className="game-info">
                                <span>Question {currentQuestionIndex + 1} of {room.quiz.questions.length}</span>
                                <div className="game-header-actions">
                                    <div className={`timer ${timeLeft <= 5 ? 'warning' : ''}`}>
                                        ⏱️ {timeLeft}s
                                    </div>
                                    {isHost && (
                                        <button
                                            onClick={handleEndGame}
                                            className="btn btn-danger btn-sm"
                                            title="End game and show results"
                                        >
                                            End Game
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Inspect Mode View for Host */}
                        {isHost && hostMode === 'inspect' ? (
                            <div className="inspect-mode-view">
                                <div className="inspect-question card">
                                    <h3 className="inspect-label">Current Question</h3>
                                    <h2 className="question-text">
                                        {room.quiz.questions[currentQuestionIndex].question}
                                    </h2>
                                    <div className="inspect-options">
                                        {room.quiz.questions[currentQuestionIndex].options.map((option, index) => (
                                            <div
                                                key={index}
                                                className={`inspect-option ${index === room.quiz.questions[currentQuestionIndex].correctAnswer ? 'correct-option' : ''}`}
                                            >
                                                <span className="option-letter">
                                                    {String.fromCharCode(65 + index)}
                                                </span>
                                                <span className="option-text">{option}</span>
                                                {index === room.quiz.questions[currentQuestionIndex].correctAnswer && (
                                                    <span className="correct-badge">✓ Correct</span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="live-leaderboard card">
                                    <h3 className="leaderboard-title">
                                        <span className="live-indicator">🔴 LIVE</span>
                                        Scoreboard
                                    </h3>
                                    <div className="leaderboard-list">
                                        {room.players
                                            .sort((a, b) => b.score - a.score)
                                            .map((player, index) => {
                                                // Check if this player answered the current question correctly
                                                const currentAnswer = player.answers[currentQuestionIndex];
                                                const answeredCorrectly = currentAnswer?.isCorrect;

                                                return (
                                                    <div key={player.user._id} className={`leaderboard-item rank-${index + 1}`}>
                                                        <div className="player-rank">#{index + 1}</div>
                                                        <img src={player.user.avatar} alt="" className="player-avatar-small" />
                                                        <div className="player-details">
                                                            <div className="player-name-score">
                                                                <span className="player-name">{player.user.username}</span>
                                                                {index === 0 && <span className="leader-badge">👑</span>}
                                                            </div>
                                                            <div className="player-stats-small">
                                                                <span>{player.answers.filter(a => a.isCorrect).length} correct</span>
                                                            </div>
                                                        </div>
                                                        <div className="player-score-display">
                                                            <span className="score-number">{player.score}</span>
                                                            <span className="score-label">pts</span>
                                                            {answeredCorrectly && (
                                                                <div className="correct-indicator">
                                                                    <span className="up-arrow">↑</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                    </div>
                                    {room.players.length > 0 && (
                                        <div className="leaderboard-footer">
                                            <p className="highest-streak">
                                                🔥 {room.players.sort((a, b) => b.score - a.score)[0]?.user.username} is leading!
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            /* Regular Player View */
                            <>
                                {!showResult ? (
                                    <div className="question-container card">
                                        <h2 className="question-text">
                                            {room.quiz.questions[currentQuestionIndex].question}
                                        </h2>

                                        {/* Power-Ups Buttons */}
                                        {room.powerUpsEnabled && (
                                            <div className="power-ups-bar">
                                                <button
                                                    className={`power-up-btn ${activePowerUp === 'doublePoints' ? 'active' : ''} ${powerUpCooldowns.doublePoints ? 'cooldown' : ''}`}
                                                    onClick={() => usePowerUp('doublePoints')}
                                                    disabled={powerUps.doublePoints <= 0 || powerUpCooldowns.doublePoints || selectedAnswer !== null}
                                                    title="Double Points - 2x points for this question"
                                                >
                                                    <span className="power-icon">💎</span>
                                                    <span className="power-name">Double Points</span>
                                                    <span className="power-count">{powerUps.doublePoints}</span>
                                                </button>

                                                <button
                                                    className={`power-up-btn ${timeFrozen ? 'active' : ''} ${powerUpCooldowns.freezeTime ? 'cooldown' : ''}`}
                                                    onClick={() => usePowerUp('freezeTime')}
                                                    disabled={powerUps.freezeTime <= 0 || powerUpCooldowns.freezeTime || selectedAnswer !== null}
                                                    title="Freeze Time - Stop the timer for 10 seconds"
                                                >
                                                    <span className="power-icon">⏸️</span>
                                                    <span className="power-name">Freeze Time</span>
                                                    <span className="power-count">{powerUps.freezeTime}</span>
                                                </button>

                                                <button
                                                    className={`power-up-btn ${powerUpCooldowns.skipQuestion ? 'cooldown' : ''}`}
                                                    onClick={() => usePowerUp('skipQuestion')}
                                                    disabled={powerUps.skipQuestion <= 0 || powerUpCooldowns.skipQuestion}
                                                    title="Skip Question - Skip without penalty"
                                                >
                                                    <span className="power-icon">⏭️</span>
                                                    <span className="power-name">Skip</span>
                                                    <span className="power-count">{powerUps.skipQuestion}</span>
                                                </button>
                                            </div>
                                        )}

                                        <div className="answers-grid">
                                            {room.quiz.questions[currentQuestionIndex].options.map((option, index) => (
                                                <button
                                                    key={index}
                                                    className={`answer-option ${selectedAnswer === index ? 'selected' : ''}`}
                                                    onClick={() => handleSelectAnswer(index)}
                                                    disabled={selectedAnswer !== null}
                                                >
                                                    <span className="option-letter">
                                                        {String.fromCharCode(65 + index)}
                                                    </span>
                                                    <span className="option-text">{option}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="result-with-leaderboard">
                                        <div className="result-container card">
                                            <div className={`result-icon ${answerResult?.isCorrect ? 'correct' : 'incorrect'}`}>
                                                {answerResult?.isCorrect ? '✓' : '✗'}
                                            </div>
                                            <h2>{answerResult?.isCorrect ? 'Correct!' : 'Incorrect!'}</h2>
                                            <p className="result-points">
                                                {answerResult?.isCorrect ? `+${answerResult.points} points` : '0 points'}
                                            </p>
                                            {!answerResult?.isCorrect && (
                                                <p className="correct-answer">
                                                    Correct answer: {room.quiz.questions[currentQuestionIndex].options[answerResult?.correctAnswer]}
                                                </p>
                                            )}
                                            <p className="total-score">Your Score: {answerResult?.totalScore}</p>
                                        </div>

                                        {/* Live Leaderboard After Each Question */}
                                        <div className="question-leaderboard card">
                                            <h3 className="leaderboard-title">
                                                <span className="live-indicator">🔴 LIVE</span>
                                                Current Standings
                                            </h3>
                                            <div className="leaderboard-list">
                                                {room.players
                                                    .sort((a, b) => b.score - a.score)
                                                    .map((player, index) => {
                                                        // Check if this player answered the current question correctly
                                                        const currentAnswer = player.answers[currentQuestionIndex];
                                                        const answeredCorrectly = currentAnswer?.isCorrect;

                                                        return (
                                                            <div
                                                                key={player.user._id}
                                                                className={`leaderboard-item rank-${index + 1} ${player.user._id === user?.id ? 'current-user' : ''}`}
                                                            >
                                                                <div className="player-rank">#{index + 1}</div>
                                                                <img src={player.user.avatar} alt="" className="player-avatar-small" />
                                                                <div className="player-details">
                                                                    <div className="player-name-score">
                                                                        <span className="player-name">
                                                                            {player.user.username}
                                                                            {player.user._id === user?.id && <span className="you-badge">You</span>}
                                                                        </span>
                                                                        {index === 0 && <span className="leader-badge">👑</span>}
                                                                    </div>
                                                                    <div className="player-stats-small">
                                                                        <span>{player.answers.filter(a => a.isCorrect).length} correct</span>
                                                                    </div>
                                                                </div>
                                                                <div className="player-score-display">
                                                                    <span className="score-number">{player.score}</span>
                                                                    <span className="score-label">pts</span>
                                                                    {answeredCorrectly && (
                                                                        <div className="correct-indicator">
                                                                            <span className="up-arrow">↑</span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default GameRoom;

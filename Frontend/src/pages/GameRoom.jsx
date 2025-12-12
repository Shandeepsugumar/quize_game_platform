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

    useEffect(() => {
        loadRoom();
    }, [roomCode]);

    useEffect(() => {
        if (room?.status === 'in-progress' && timeLeft > 0 && !selectedAnswer) {
            const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
            return () => clearTimeout(timer);
        } else if (timeLeft === 0 && !selectedAnswer) {
            handleSubmitAnswer(null);
        }
    }, [timeLeft, room, selectedAnswer]);

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

    const handleJoinRoom = async () => {
        try {
            await roomAPI.joinRoom({ roomCode });
            loadRoom();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to join room');
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
                timeSpent
            });

            setAnswerResult(response.data);
            setShowResult(true);

            setTimeout(() => {
                if (currentQuestionIndex < room.quiz.questions.length - 1) {
                    setCurrentQuestionIndex(currentQuestionIndex + 1);
                    setSelectedAnswer(null);
                    setShowResult(false);
                    setAnswerResult(null);
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
                                <div className={`timer ${timeLeft <= 5 ? 'warning' : ''}`}>
                                    ⏱️ {timeLeft}s
                                </div>
                            </div>
                        </div>

                        {!showResult ? (
                            <div className="question-container card">
                                <h2 className="question-text">
                                    {room.quiz.questions[currentQuestionIndex].question}
                                </h2>
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
                                <p className="total-score">Total Score: {answerResult?.totalScore}</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default GameRoom;

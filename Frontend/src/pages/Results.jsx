import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { gameAPI } from '../services/api';
import './Results.css';

const Results = () => {
    const { roomCode } = useParams();
    const navigate = useNavigate();
    const [results, setResults] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadResults();
    }, [roomCode]);

    const loadResults = async () => {
        try {
            const response = await gameAPI.getResults(roomCode);
            setResults(response.data);
        } catch (error) {
            console.error('Error loading results:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="results-container">
                <div className="loading-container">
                    <div className="spinner"></div>
                </div>
            </div>
        );
    }

    if (!results) {
        return (
            <div className="results-container">
                <div className="error-container">
                    <h2>Results not found</h2>
                    <button onClick={() => navigate('/dashboard')} className="btn btn-primary">
                        Back to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    const topFive = results.rankings.slice(0, 5);

    return (
        <div className="results-container">
            <div className="container">
                <div className="results-header fade-in">
                    <h1>🎉 Game Results</h1>
                    <div className="quiz-title">{results.room.quiz.title}</div>
                    <div className="room-code-badge">{results.room.roomCode}</div>
                </div>

                {results.rankings.length >= 3 && (
                    <div className="podium-container fade-in">
                        <div className="podium">
                            <div className="podium-place second-place">
                                <div className="winner-card">
                                    <div className="medal">🥈</div>
                                    <img
                                        src={results.rankings[1].user.avatar}
                                        alt=""
                                        className="winner-avatar"
                                    />
                                    <h3>{results.rankings[1].user.username}</h3>
                                    <div className="winner-score">{results.rankings[1].score}</div>
                                    <div className="winner-stats">
                                        <span>{results.rankings[1].correctAnswers}/{results.rankings[1].totalQuestions}</span>
                                        <span>{results.rankings[1].accuracy.toFixed(1)}%</span>
                                    </div>
                                </div>
                                <div className="podium-stand second">
                                    <span className="rank-number">2</span>
                                </div>
                            </div>

                            <div className="podium-place first-place">
                                <div className="winner-card champion">
                                    <div className="crown">👑</div>
                                    <div className="medal">🥇</div>
                                    <img
                                        src={results.rankings[0].user.avatar}
                                        alt=""
                                        className="winner-avatar"
                                    />
                                    <h3>{results.rankings[0].user.username}</h3>
                                    <div className="winner-score">{results.rankings[0].score}</div>
                                    <div className="winner-stats">
                                        <span>{results.rankings[0].correctAnswers}/{results.rankings[0].totalQuestions}</span>
                                        <span>{results.rankings[0].accuracy.toFixed(1)}%</span>
                                    </div>
                                </div>
                                <div className="podium-stand first">
                                    <span className="rank-number">1</span>
                                </div>
                            </div>

                            <div className="podium-place third-place">
                                <div className="winner-card">
                                    <div className="medal">🥉</div>
                                    <img
                                        src={results.rankings[2].user.avatar}
                                        alt=""
                                        className="winner-avatar"
                                    />
                                    <h3>{results.rankings[2].user.username}</h3>
                                    <div className="winner-score">{results.rankings[2].score}</div>
                                    <div className="winner-stats">
                                        <span>{results.rankings[2].correctAnswers}/{results.rankings[2].totalQuestions}</span>
                                        <span>{results.rankings[2].accuracy.toFixed(1)}%</span>
                                    </div>
                                </div>
                                <div className="podium-stand third">
                                    <span className="rank-number">3</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div className="rankings-section fade-in">
                    <h2>🏆 Top 5 Players</h2>
                    <div className="rankings-list">
                        {topFive.map((player, index) => (
                            <div
                                key={player.user._id}
                                className={`ranking-item ${index === 0 ? 'rank-1' :
                                        index === 1 ? 'rank-2' :
                                            index === 2 ? 'rank-3' : ''
                                    }`}
                            >
                                <div className="rank-position">
                                    {index === 0 ? '🥇' :
                                        index === 1 ? '🥈' :
                                            index === 2 ? '🥉' :
                                                `#${player.rank}`}
                                </div>
                                <img
                                    src={player.user.avatar}
                                    alt=""
                                    className="ranking-avatar"
                                />
                                <div className="ranking-info">
                                    <h4>{player.user.username}</h4>
                                    <div className="ranking-details">
                                        <span className="detail-item">
                                            ✓ {player.correctAnswers}/{player.totalQuestions} correct
                                        </span>
                                        <span className="detail-item">
                                            📊 {player.accuracy.toFixed(1)}% accuracy
                                        </span>
                                    </div>
                                </div>
                                <div className="ranking-score">
                                    <span className="score-value">{player.score}</span>
                                    <span className="score-label">points</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {results.rankings.length > 5 && (
                    <div className="all-players-section fade-in">
                        <h3>All Players</h3>
                        <div className="simple-rankings">
                            {results.rankings.slice(5).map((player) => (
                                <div key={player.user._id} className="simple-ranking-item">
                                    <span className="simple-rank">#{player.rank}</span>
                                    <img src={player.user.avatar} alt="" className="simple-avatar" />
                                    <span className="simple-name">{player.user.username}</span>
                                    <span className="simple-score">{player.score} pts</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="results-actions fade-in">
                    <button onClick={() => navigate('/dashboard')} className="btn btn-primary btn-lg">
                        Back to Dashboard
                    </button>
                    <button
                        onClick={() => window.location.reload()}
                        className="btn btn-outline btn-lg"
                    >
                        View Again
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Results;

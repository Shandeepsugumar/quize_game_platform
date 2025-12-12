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
            console.log('Loading results for room:', roomCode);
            const response = await gameAPI.getResults(roomCode);
            console.log('Results loaded:', response.data);
            setResults(response.data);
        } catch (error) {
            console.error('Error loading results:', error);
            console.error('Error response:', error.response?.data);
            console.error('Error status:', error.response?.status);
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

    return (
        <div className="results-container">
            <div className="podium-wrapper">
                <div className="podium-header fade-in">
                    <h1 className="podium-title">Podium!</h1>
                    <div className="quiz-subtitle">{results.room.quiz.title}</div>
                </div>

                {results.rankings.length >= 1 && (
                    <div className="podium-stage fade-in">
                        {/* Second Place - Left */}
                        <div className="podium-position second-position">
                            {results.rankings[1] ? (
                                <>
                                    <div className="player-info">
                                        <img
                                            src={results.rankings[1].user.avatar}
                                            alt={results.rankings[1].user.username}
                                            className="player-avatar"
                                        />
                                        <div className="player-name">{results.rankings[1].user.username}</div>
                                    </div>
                                    <div className="podium-block second-block">
                                        <div className="medal-circle silver-medal">
                                            <span className="medal-number">2</span>
                                        </div>
                                        <div className="score-display">{results.rankings[1].score}</div>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="player-info">
                                        <div className="empty-avatar"></div>
                                        <div className="player-name empty-name">---</div>
                                    </div>
                                    <div className="podium-block second-block empty-block">
                                        <div className="medal-circle silver-medal empty-medal">
                                            <span className="medal-number">2</span>
                                        </div>
                                        <div className="score-display">---</div>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* First Place - Center */}
                        <div className="podium-position first-position">
                            <div className="player-info winner-info">
                                <div className="crown-icon">👑</div>
                                <img
                                    src={results.rankings[0].user.avatar}
                                    alt={results.rankings[0].user.username}
                                    className="player-avatar winner-avatar"
                                />
                                <div className="player-name winner-name">{results.rankings[0].user.username}</div>
                            </div>
                            <div className="podium-block first-block">
                                <div className="medal-circle gold-medal">
                                    <span className="medal-number">1</span>
                                </div>
                                <div className="score-display winner-score">{results.rankings[0].score}</div>
                            </div>
                        </div>

                        {/* Third Place - Right */}
                        <div className="podium-position third-position">
                            {results.rankings[2] ? (
                                <>
                                    <div className="player-info">
                                        <img
                                            src={results.rankings[2].user.avatar}
                                            alt={results.rankings[2].user.username}
                                            className="player-avatar"
                                        />
                                        <div className="player-name">{results.rankings[2].user.username}</div>
                                    </div>
                                    <div className="podium-block third-block">
                                        <div className="medal-circle bronze-medal">
                                            <span className="medal-number">3</span>
                                        </div>
                                        <div className="score-display">{results.rankings[2].score}</div>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="player-info">
                                        <div className="empty-avatar"></div>
                                        <div className="player-name empty-name">---</div>
                                    </div>
                                    <div className="podium-block third-block empty-block">
                                        <div className="medal-circle bronze-medal empty-medal">
                                            <span className="medal-number">3</span>
                                        </div>
                                        <div className="score-display">---</div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                )}

                {/* Additional Rankings */}
                {results.rankings.length > 3 && (
                    <div className="additional-rankings fade-in">
                        <h3 className="rankings-title">Other Players</h3>
                        <div className="rankings-list">
                            {results.rankings.slice(3).map((player, index) => (
                                <div key={player.user._id} className="ranking-row">
                                    <span className="rank-badge">#{index + 4}</span>
                                    <img src={player.user.avatar} alt="" className="rank-avatar" />
                                    <span className="rank-name">{player.user.username}</span>
                                    <span className="rank-score">{player.score} pts</span>
                                    <span className="rank-accuracy">{player.accuracy.toFixed(1)}%</span>
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

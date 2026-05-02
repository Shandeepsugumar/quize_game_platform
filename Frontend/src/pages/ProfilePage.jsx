import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { leaderboardAPI, quizAPI } from '../services/api';
import AvatarPicker, { AvatarPickerTrigger } from '../components/AvatarPicker';
import { findAvatarByUrl, getDefaultAvatar } from '../components/avatarData';
import './Profile.css';

const ProfilePage = () => {
    const navigate = useNavigate();
    const { user, logout, updateProfile } = useAuth();
    const [myQuizzes, setMyQuizzes] = useState([]);
    const [leaderboard, setLeaderboard] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [showAvatarPicker, setShowAvatarPicker] = useState(false);
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        confirmPassword: '',
        avatarUrl: '',
        avatarName: '',
    });

    useEffect(() => {
        if (!user) {
            return;
        }

        const existingAvatar = findAvatarByUrl(user.avatar);
        setFormData({
            username: user.username || '',
            email: user.email || '',
            password: '',
            confirmPassword: '',
            avatarUrl: user.avatar || getDefaultAvatar().url,
            avatarName: existingAvatar?.name || 'Current Avatar',
        });
    }, [user]);

    useEffect(() => {
        const loadProfileData = async () => {
            if (!user?.id) {
                return;
            }

            setLoading(true);
            try {
                const [myQuizzesResponse, leaderboardResponse, statsResponse] = await Promise.all([
                    quizAPI.getMyQuizzes(),
                    leaderboardAPI.getGlobalLeaderboard(10),
                    leaderboardAPI.getUserStats(user.id),
                ]);

                setMyQuizzes(myQuizzesResponse.data.quizzes || []);
                setLeaderboard(leaderboardResponse.data.leaderboard || []);
                setStats(statsResponse.data.stats || null);
            } catch (fetchError) {
                setError(fetchError.response?.data?.message || 'Failed to load profile data');
            } finally {
                setLoading(false);
            }
        };

        loadProfileData();
    }, [user?.id]);

    const handleInputChange = (event) => {
        const { name, value } = event.target;
        setFormData((current) => ({ ...current, [name]: value }));
        setError('');
        setSuccess('');
    };

    const handleAvatarSelect = (avatar) => {
        setFormData((current) => ({
            ...current,
            avatarUrl: avatar.url,
            avatarName: avatar.name,
        }));
        setError('');
        setSuccess('');
    };

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    const handleSaveProfile = async (event) => {
        event.preventDefault();
        setError('');
        setSuccess('');

        if (formData.password && formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        setSaving(true);
        try {
            const updatePayload = {
                username: formData.username,
                email: formData.email,
                avatar: formData.avatarUrl,
            };

            if (formData.password) {
                updatePayload.password = formData.password;
            }

            const response = await updateProfile(updatePayload);

            if (!response.success) {
                setError(response.error || 'Failed to update profile');
                return;
            }

            setSuccess('Profile updated successfully');
            setIsEditing(false);
            setFormData((current) => ({
                ...current,
                password: '',
                confirmPassword: '',
            }));

            const [myQuizzesResponse, leaderboardResponse, statsResponse] = await Promise.all([
                quizAPI.getMyQuizzes(),
                leaderboardAPI.getGlobalLeaderboard(10),
                leaderboardAPI.getUserStats(user.id),
            ]);

            setMyQuizzes(myQuizzesResponse.data.quizzes || []);
            setLeaderboard(leaderboardResponse.data.leaderboard || []);
            setStats(statsResponse.data.stats || null);
        } catch (saveError) {
            setError(saveError.response?.data?.message || 'Failed to update profile');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="profile-page">
            <div className="profile-background" />
            <main className="profile-shell">
                <section className="profile-hero card-shell">
                    <div className="profile-hero-copy">
                        <p className="profile-eyebrow">Your account</p>
                        <h1>Profile center</h1>
                        <p className="profile-intro">
                            Manage your identity, track your points, review your quizzes, and keep an eye on the global leaderboard from one place.
                        </p>
                        <div className="profile-actions">
                            <button type="button" className="btn-primary" onClick={() => setIsEditing((current) => !current)}>
                                {isEditing ? 'Close Edit Profile' : 'Edit Profile'}
                            </button>
                            <button type="button" className="btn-secondary" onClick={handleLogout}>
                                Logout
                            </button>
                        </div>
                    </div>

                    <div className="profile-avatar-card">
                        <div className="avatar-frame">
                            <img src={user?.avatar || formData.avatarUrl} alt={user?.username || 'Profile avatar'} />
                        </div>
                        <div className="profile-stats-grid">
                            <div>
                                <span>Points</span>
                                <strong>{stats?.totalScore ?? user?.totalScore ?? 0}</strong>
                            </div>
                            <div>
                                <span>Rank</span>
                                <strong>#{stats?.rank ?? '--'}</strong>
                            </div>
                            <div>
                                <span>Quizzes</span>
                                <strong>{myQuizzes.length}</strong>
                            </div>
                            <div>
                                <span>Won</span>
                                <strong>{stats?.gamesWon ?? user?.gamesWon ?? 0}</strong>
                            </div>
                        </div>
                    </div>
                </section>

                {error && <div className="profile-alert error">{error}</div>}
                {success && <div className="profile-alert success">{success}</div>}

                <section className="profile-grid">
                    <div className="profile-panel card-shell">
                        <div className="section-heading">
                            <h2>Account details</h2>
                            <p>Current profile information stored in the users table.</p>
                        </div>
                        <div className="detail-list">
                            <div>
                                <span>Username</span>
                                <strong>{user?.username || '—'}</strong>
                            </div>
                            <div>
                                <span>Email</span>
                                <strong>{user?.email || '—'}</strong>
                            </div>
                            <div>
                                <span>Joined</span>
                                <strong>{user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}</strong>
                            </div>
                            <div>
                                <span>Games played</span>
                                <strong>{stats?.gamesPlayed ?? user?.gamesPlayed ?? 0}</strong>
                            </div>
                        </div>

                        {isEditing && (
                            <form className="profile-form" onSubmit={handleSaveProfile}>
                                <div className="field-grid">
                                    <label>
                                        Username
                                        <input name="username" value={formData.username} onChange={handleInputChange} />
                                    </label>
                                    <label>
                                        Email
                                        <input name="email" type="email" value={formData.email} onChange={handleInputChange} />
                                    </label>
                                </div>

                                <div className="field-grid">
                                    <label>
                                        New password
                                        <input
                                            name="password"
                                            type="password"
                                            value={formData.password}
                                            onChange={handleInputChange}
                                            placeholder="Leave blank to keep current password"
                                        />
                                    </label>
                                    <label>
                                        Confirm password
                                        <input
                                            name="confirmPassword"
                                            type="password"
                                            value={formData.confirmPassword}
                                            onChange={handleInputChange}
                                            placeholder="Repeat new password"
                                        />
                                    </label>
                                </div>

                                <div className="avatar-builder">
                                    <div className="avatar-builder-copy">
                                        <h3>🎭 3D Avatar Studio</h3>
                                        <p>Choose your favorite 3D character from our collection of male & female avatars.</p>
                                    </div>

                                    <AvatarPickerTrigger
                                        avatarUrl={formData.avatarUrl}
                                        name={formData.avatarName}
                                        onClick={() => setShowAvatarPicker(true)}
                                    />
                                </div>

                                <div className="form-actions">
                                    <button type="submit" className="btn-primary" disabled={saving}>
                                        {saving ? 'Saving...' : 'Save Changes'}
                                    </button>
                                    <button type="button" className="btn-secondary" onClick={() => setIsEditing(false)}>
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>

                    <div className="profile-panel card-shell">
                        <div className="section-heading">
                            <h2>My quizzes</h2>
                            <p>All quizzes created by this account.</p>
                        </div>

                        {loading ? (
                            <div className="panel-state">Loading your profile data...</div>
                        ) : myQuizzes.length === 0 ? (
                            <div className="panel-state">No quizzes created yet.</div>
                        ) : (
                            <div className="quiz-list">
                                {myQuizzes.map((quiz) => (
                                    <article key={quiz.id} className="quiz-mini-card">
                                        <div>
                                            <h3>{quiz.title}</h3>
                                            <p>{quiz.description || 'No description provided.'}</p>
                                        </div>
                                        <div className="quiz-mini-meta">
                                            <span>{quiz.category}</span>
                                            <span>{quiz.difficulty}</span>
                                            <span>{quiz.timesPlayed || 0} plays</span>
                                        </div>
                                    </article>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="profile-panel card-shell">
                        <div className="section-heading">
                            <h2>Global leaderboard</h2>
                            <p>Top players across the app.</p>
                        </div>

                        <div className="leaderboard-list">
                            {leaderboard.map((entry) => (
                                <div key={entry.user.id} className={`leaderboard-row ${entry.user.id === user?.id ? 'me' : ''}`}>
                                    <div className="leaderboard-rank">#{entry.rank}</div>
                                    <img src={entry.user.avatar} alt={entry.user.username} className="leaderboard-avatar" />
                                    <div className="leaderboard-user">
                                        <strong>{entry.user.username}</strong>
                                        <span>{entry.gamesWon}/{entry.gamesPlayed} wins</span>
                                    </div>
                                    <div className="leaderboard-score">{entry.totalScore} pts</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            </main>

            {/* Avatar Picker Modal */}
            <AvatarPicker
                isOpen={showAvatarPicker}
                onClose={() => setShowAvatarPicker(false)}
                onSelect={handleAvatarSelect}
                currentUrl={formData.avatarUrl}
            />
        </div>
    );
};

export default ProfilePage;
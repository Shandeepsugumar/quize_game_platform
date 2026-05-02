import React, { useState, useEffect, useCallback } from 'react';
import { maleAvatars, femaleAvatars, findAvatarByUrl } from './avatarData';
import './AvatarPicker.css';

/**
 * AvatarPicker – Full-screen modal for choosing a 3D avatar.
 *
 * Props
 * ─────
 * @param {boolean}  isOpen       – controls modal visibility
 * @param {function} onClose      – called when the modal is dismissed
 * @param {function} onSelect     – called with the chosen avatar object when confirmed
 * @param {string}   [currentUrl] – currently active avatar URL (to pre-select)
 */
const AvatarPicker = ({ isOpen, onClose, onSelect, currentUrl }) => {
    const [activeGender, setActiveGender] = useState('male');
    const [selectedAvatar, setSelectedAvatar] = useState(null);

    // Pre-select the current avatar when opening
    useEffect(() => {
        if (isOpen && currentUrl) {
            const found = findAvatarByUrl(currentUrl);
            if (found) {
                setSelectedAvatar(found);
                setActiveGender(found.id.startsWith('f') ? 'female' : 'male');
            }
        }
    }, [isOpen, currentUrl]);

    // Close on Escape
    useEffect(() => {
        if (!isOpen) return;
        const handler = (e) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [isOpen, onClose]);

    // Prevent body scroll when open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

    const handleConfirm = useCallback(() => {
        if (selectedAvatar) {
            onSelect(selectedAvatar);
            onClose();
        }
    }, [selectedAvatar, onSelect, onClose]);

    if (!isOpen) return null;

    const avatars = activeGender === 'male' ? maleAvatars : femaleAvatars;

    return (
        <div className="avatar-picker-overlay" onClick={onClose}>
            <div className="avatar-picker-modal" onClick={(e) => e.stopPropagation()}>
                {/* ─── Header ─── */}
                <div className="avatar-picker-header">
                    <div>
                        <h2>🎭 Choose Your Avatar</h2>
                        <p>Pick your favorite 3D character to represent you</p>
                    </div>
                    <button
                        className="avatar-picker-close"
                        onClick={onClose}
                        aria-label="Close avatar picker"
                    >
                        ✕
                    </button>
                </div>

                {/* ─── Gender Tabs ─── */}
                <div className="avatar-gender-tabs">
                    <button
                        className={`gender-tab male-tab ${activeGender === 'male' ? 'active' : ''}`}
                        onClick={() => setActiveGender('male')}
                    >
                        <span className="gender-tab-icon">🧑</span>
                        Male
                        <span className="gender-tab-count">{maleAvatars.length}</span>
                    </button>
                    <button
                        className={`gender-tab female-tab ${activeGender === 'female' ? 'active' : ''}`}
                        onClick={() => setActiveGender('female')}
                    >
                        <span className="gender-tab-icon">👩</span>
                        Female
                        <span className="gender-tab-count">{femaleAvatars.length}</span>
                    </button>
                </div>

                {/* ─── Avatar Grid ─── */}
                <div className="avatar-grid-container">
                    <div className="avatar-grid" key={activeGender}>
                        {avatars.map((avatar) => (
                            <div
                                key={avatar.id}
                                className={`avatar-card ${selectedAvatar?.id === avatar.id ? 'selected' : ''}`}
                                onClick={() => setSelectedAvatar(avatar)}
                                role="button"
                                tabIndex={0}
                                aria-label={`Select avatar ${avatar.name}`}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        setSelectedAvatar(avatar);
                                    }
                                }}
                            >
                                <div className="avatar-card-image">
                                    <img
                                        src={avatar.url}
                                        alt={avatar.name}
                                        loading="lazy"
                                    />
                                </div>
                                <span className="avatar-card-name">{avatar.name}</span>
                                <span className="avatar-card-personality">{avatar.personality}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ─── Footer ─── */}
                <div className="avatar-picker-footer">
                    <div className="avatar-picker-preview">
                        {selectedAvatar ? (
                            <>
                                <img src={selectedAvatar.url} alt={selectedAvatar.name} />
                                <div className="avatar-picker-preview-info">
                                    <span className="avatar-picker-preview-name">{selectedAvatar.name}</span>
                                    <span className="avatar-picker-preview-tag">{selectedAvatar.personality}</span>
                                </div>
                            </>
                        ) : (
                            <div className="avatar-picker-preview-info">
                                <span className="avatar-picker-preview-name" style={{ opacity: 0.5 }}>
                                    No avatar selected
                                </span>
                                <span className="avatar-picker-preview-tag">Click on an avatar above</span>
                            </div>
                        )}
                    </div>
                    <div className="avatar-picker-actions">
                        <button className="ap-btn ap-btn-cancel" onClick={onClose}>
                            Cancel
                        </button>
                        <button
                            className="ap-btn ap-btn-confirm"
                            onClick={handleConfirm}
                            disabled={!selectedAvatar}
                        >
                            Confirm Choice
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

/**
 * AvatarPickerTrigger – Inline button that opens the picker.
 * Place this inside forms where users can change their avatar.
 *
 * Props
 * ─────
 * @param {string}   avatarUrl – current avatar URL to display
 * @param {string}   [name]    – avatar name to display
 * @param {function} onClick   – called when clicked (should open the picker)
 */
export const AvatarPickerTrigger = ({ avatarUrl, name, onClick }) => {
    return (
        <div
            className="avatar-picker-trigger"
            onClick={onClick}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onClick();
                }
            }}
        >
            <img
                src={avatarUrl || 'https://api.dicebear.com/7.x/lorelei/svg?seed=default'}
                alt={name || 'Avatar'}
            />
            <div className="avatar-picker-trigger-text">
                <strong>{name || 'Choose Avatar'}</strong>
                <span>Click to select your 3D character</span>
            </div>
        </div>
    );
};

export default AvatarPicker;

import React from 'react';

const BrandMark = ({ size = 'md', showTagline = true, className = '' }) => {
    const classes = ['brand-mark', `brand-mark--${size}`, className].filter(Boolean).join(' ');

    return (
        <div className={classes}>
            <div className="brand-mark__icon" aria-hidden="true">
                {/* SVG Brain + Lightning Logo */}
                <svg className="brand-mark__svg" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                    {/* Glow filter */}
                    <defs>
                        <linearGradient id="brainGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#a78bfa" />
                            <stop offset="50%" stopColor="#818cf8" />
                            <stop offset="100%" stopColor="#f472b6" />
                        </linearGradient>
                        <linearGradient id="boltGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#fbbf24" />
                            <stop offset="100%" stopColor="#f59e0b" />
                        </linearGradient>
                        <filter id="glow">
                            <feGaussianBlur stdDeviation="1.5" result="blur" />
                            <feMerge>
                                <feMergeNode in="blur" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>
                    </defs>
                    {/* Brain outline */}
                    <path
                        d="M24 6C18 6 14 9 13 13C11 13.5 8 15.5 8 20C8 23 9.5 25 11 26C11 28 12 31 14 33C16 35 19 37 24 38C29 37 32 35 34 33C36 31 37 28 37 26C38.5 25 40 23 40 20C40 15.5 37 13.5 35 13C34 9 30 6 24 6Z"
                        stroke="url(#brainGrad)"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        fill="rgba(129, 140, 248, 0.12)"
                        filter="url(#glow)"
                    />
                    {/* Brain center fold */}
                    <path
                        d="M24 10V34"
                        stroke="url(#brainGrad)"
                        strokeWidth="1.2"
                        strokeLinecap="round"
                        opacity="0.6"
                    />
                    {/* Brain wrinkle left */}
                    <path
                        d="M14 18C17 17 20 19 22 18"
                        stroke="url(#brainGrad)"
                        strokeWidth="1.2"
                        strokeLinecap="round"
                        opacity="0.5"
                    />
                    {/* Brain wrinkle right */}
                    <path
                        d="M26 18C28 19 31 17 34 18"
                        stroke="url(#brainGrad)"
                        strokeWidth="1.2"
                        strokeLinecap="round"
                        opacity="0.5"
                    />
                    {/* Brain wrinkle left lower */}
                    <path
                        d="M15 25C18 24 20 26 23 25"
                        stroke="url(#brainGrad)"
                        strokeWidth="1.2"
                        strokeLinecap="round"
                        opacity="0.4"
                    />
                    {/* Brain wrinkle right lower */}
                    <path
                        d="M25 25C27 26 30 24 33 25"
                        stroke="url(#brainGrad)"
                        strokeWidth="1.2"
                        strokeLinecap="round"
                        opacity="0.4"
                    />
                    {/* Lightning bolt overlay */}
                    <path
                        d="M22 16L18 24H23L20 32L30 22H25L28 16H22Z"
                        fill="url(#boltGrad)"
                        filter="url(#glow)"
                        className="brand-mark__bolt"
                    />
                </svg>
                {/* Animated pulse ring */}
                <span className="brand-mark__pulse-ring"></span>
            </div>
            <div className="brand-mark__copy">
                <span className="brand-mark__name">
                    <span className="brand-mark__name-brain">Brain</span>
                    <span className="brand-mark__name-burst">Burst</span>
                </span>
                {showTagline && <span className="brand-mark__tagline">Think Fast. Play Smart. Win Big.</span>}
            </div>
        </div>
    );
};

export default BrandMark;
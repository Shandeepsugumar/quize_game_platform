import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { quizAPI, roomAPI, aiAPI } from '../services/api';
import DOMPurify from 'dompurify';
import './AIAgent.css';

// System prompts for different modes
const CHAT_SYSTEM_PROMPT = `You are BrainBurst AI — a friendly, knowledgeable quiz assistant embedded in the BrainBurst quiz platform. You can:
• Help users understand quiz topics and concepts
• Explain answers and provide learning context
• Suggest quiz strategies and study tips
• Answer general knowledge questions
• Help users prepare for specific quiz categories

Keep responses concise, engaging, and educational. Use emojis sparingly for personality.
If the user asks about creating a quiz, guide them to use the "Quiz Setup" tab.
Format answers with bullet points or numbered lists when appropriate.`;

const SETUP_SYSTEM_PROMPT = `You are a quiz setup assistant for BrainBurst. When given quiz configuration details, generate high-quality multiple-choice questions.

IMPORTANT: Return ONLY a valid JSON array of question objects. No extra text, no markdown code fences, no explanation.
Each question object must have exactly these fields:
{
  "question": "string - the question text",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correctAnswer": 0,
  "points": 10,
  "timeLimit": 30
}

The correctAnswer field is a 0-based index (0=A, 1=B, 2=C, 3=D).
Make questions educational, clear, and appropriately challenging.`;

const AIAgent = ({ currentQuizTopic, currentQuestion }) => {
    const navigate = useNavigate();
    const { user } = useAuth();

    const [isOpen, setIsOpen] = useState(false);
    const [activeMode, setActiveMode] = useState('chat'); // 'chat' or 'setup'
    const [messages, setMessages] = useState([]);
    const [inputValue, setInputValue] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [error, setError] = useState('');
    
    // Quiz setup state
    const [setupConfig, setSetupConfig] = useState({
        topic: currentQuizTopic || '',
        questionCount: 5,
        difficulty: 'Medium',
        timePerQuestion: 30
    });
    const [generatedQuestions, setGeneratedQuestions] = useState(null);
    const [isGenerating, setIsGenerating] = useState(false);

    // Auto-create flow state
    const [creationStep, setCreationStep] = useState('idle'); // 'idle' | 'generating' | 'creating-quiz' | 'creating-room' | 'done'
    const [createdRoomCode, setCreatedRoomCode] = useState(null);

    const messagesEndRef = useRef(null);
    const textareaRef = useRef(null);

    // Scroll to bottom when new messages arrive
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isTyping]);

    // Update setup topic if currentQuizTopic changes
    useEffect(() => {
        if (currentQuizTopic) {
            setSetupConfig(prev => ({ ...prev, topic: currentQuizTopic }));
        }
    }, [currentQuizTopic]);

    // Auto-resize textarea
    const handleTextareaInput = useCallback((e) => {
        const ta = e.target;
        ta.style.height = 'auto';
        ta.style.height = Math.min(ta.scrollHeight, 120) + 'px';
        setInputValue(ta.value);
    }, []);

    // Call AI via backend proxy (API key stays server-side)
    const callAI = async (userMessage, systemPrompt) => {
        const response = await aiAPI.chat([
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage }
        ]);

        return response.data?.content || 'No response generated.';
    };

    // Sanitize and format message content for safe rendering
    const formatMessage = (content) => {
        const formatted = content
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/`(.*?)`/g, '<code>$1</code>')
            .replace(/\n/g, '<br/>');
        
        // Sanitize HTML to prevent XSS
        return DOMPurify.sanitize(formatted, {
            ALLOWED_TAGS: ['strong', 'code', 'br', 'em', 'ul', 'ol', 'li', 'p'],
            ALLOWED_ATTR: []
        });
    };

    // ═══════════════════════════════════════════════
    //  AUTO-CREATE QUIZ GAME FLOW
    //  1. Generate questions via LLM
    //  2. Create quiz via backend API
    //  3. Create room via backend API
    //  4. Navigate user to game room
    // ═══════════════════════════════════════════════
    const handleAutoCreateGame = async () => {
        if (!setupConfig.topic.trim()) {
            setError('Please enter a quiz topic');
            return;
        }

        setError('');
        setCreatedRoomCode(null);

        try {
            // ── Step 1: Generate Questions ──
            setCreationStep('generating');
            setIsGenerating(true);
            setGeneratedQuestions(null);

            const prompt = `Generate exactly ${setupConfig.questionCount} multiple-choice questions on the topic: "${setupConfig.topic}".
Difficulty level: ${setupConfig.difficulty}.
Each question should have 4 options with one correct answer.
Set timeLimit to ${setupConfig.timePerQuestion} for each question.
Return ONLY a valid JSON array.`;

            const reply = await callAI(prompt, SETUP_SYSTEM_PROMPT);

            // Parse JSON
            let cleanedReply = reply.trim();
            if (cleanedReply.startsWith('```')) {
                cleanedReply = cleanedReply.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
            }

            const questions = JSON.parse(cleanedReply);

            if (!Array.isArray(questions) || questions.length === 0) {
                throw new Error('Invalid question format received from AI');
            }

            setGeneratedQuestions(questions);
            setIsGenerating(false);

            // ── Step 2: Create Quiz via Backend ──
            setCreationStep('creating-quiz');

            const quizPayload = {
                title: `AI: ${setupConfig.topic}`,
                description: `AI-generated ${setupConfig.difficulty} quiz on ${setupConfig.topic} (${questions.length} questions)`,
                category: detectCategory(setupConfig.topic),
                difficulty: setupConfig.difficulty,
                questions: questions
            };

            const quizResponse = await quizAPI.createQuiz(quizPayload);
            const quizId = quizResponse.data.quiz?._id || quizResponse.data.quiz?.id || quizResponse.data._id || quizResponse.data.id;

            if (!quizId) {
                throw new Error('Quiz was created but no ID was returned');
            }

            // ── Step 3: Create Room ──
            setCreationStep('creating-room');

            const roomResponse = await roomAPI.createRoom({
                name: `${user?.username || 'Player'}'s AI Quiz`,
                quizId,
                maxPlayers: 50
            });

            const roomCode = roomResponse.data.room?.roomCode;

            if (!roomCode) {
                throw new Error('Room was created but no room code was returned');
            }

            setCreatedRoomCode(roomCode);
            setCreationStep('done');

            // ── Step 4: Auto-navigate after a brief delay ──
            setTimeout(() => {
                setIsOpen(false);
                navigate(`/room/${roomCode}`);
            }, 1500);

        } catch (err) {
            console.error('Auto-create game error:', err);
            setError(err.response?.data?.message || err.message || 'Failed to create game');
            setCreationStep('idle');
            setIsGenerating(false);
        }
    };

    // Simple topic → category mapper
    const detectCategory = (topic) => {
        const t = topic.toLowerCase();
        if (/java|python|javascript|react|code|program|software|css|html|web|api|database|sql/i.test(t)) return 'Technology';
        if (/math|algebra|calculus|geometry|statistics|equation/i.test(t)) return 'Mathematics';
        if (/physics|chemistry|biology|science|atom|molecule|cell/i.test(t)) return 'Science';
        if (/history|war|ancient|medieval|empire|civilization/i.test(t)) return 'History';
        if (/geography|country|capital|continent|ocean|river/i.test(t)) return 'Geography';
        if (/sport|football|cricket|tennis|basketball|olympic/i.test(t)) return 'Sports';
        if (/movie|music|game|film|actor|singer|entertainment/i.test(t)) return 'Entertainment';
        return 'General Knowledge';
    };

    // Send chat message
    const handleSendMessage = async () => {
        const msg = inputValue.trim();
        if (!msg || isTyping) return;

        setError('');
        const userMsg = {
            role: 'user',
            content: msg,
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMsg]);
        setInputValue('');

        // Reset textarea height
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
        }

        setIsTyping(true);

        try {
            // Build context with current quiz info if available
            let contextMsg = msg;
            if (currentQuestion) {
                contextMsg += `\n\n[Context: The user is currently on this quiz question: "${currentQuestion.question}"]`;
            }
            if (currentQuizTopic) {
                contextMsg += `\n\n[Context: Current quiz topic is "${currentQuizTopic}"]`;
            }

            const reply = await callAI(contextMsg, CHAT_SYSTEM_PROMPT);

            setMessages(prev => [...prev, {
                role: 'assistant',
                content: reply,
                timestamp: new Date()
            }]);
        } catch (err) {
            setError(err.response?.data?.message || err.message || 'Failed to get AI response');
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: '⚠️ Sorry, I encountered an error. Please try again.',
                timestamp: new Date()
            }]);
        } finally {
            setIsTyping(false);
        }
    };

    // Handle keyboard shortcuts
    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    // Quick action handlers
    const handleQuickAction = (prompt) => {
        setInputValue(prompt);
        setTimeout(() => textareaRef.current?.focus(), 50);
    };

    // Copy generated questions to clipboard
    const handleCopyQuestions = () => {
        if (generatedQuestions) {
            navigator.clipboard.writeText(JSON.stringify(generatedQuestions, null, 2));
        }
    };

    // Navigate to already-created room
    const handleGoToRoom = () => {
        if (createdRoomCode) {
            setIsOpen(false);
            navigate(`/room/${createdRoomCode}`);
        }
    };

    // Reset creation state
    const handleResetSetup = () => {
        setCreationStep('idle');
        setGeneratedQuestions(null);
        setCreatedRoomCode(null);
        setError('');
    };

    // Format timestamp
    const formatTime = (date) => {
        return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const quickActions = [
        { label: '💡 Explain a concept', prompt: 'Can you explain ' },
        { label: '🎯 Quiz strategy', prompt: 'What are some good quiz-taking strategies?' },
        { label: '📚 Study tips', prompt: 'Give me study tips for ' },
        { label: '🧠 Fun fact', prompt: 'Tell me an interesting fact about ' }
    ];

    // ── Step label for progress display ──
    const getStepStatus = (step) => {
        const steps = {
            'generating': { label: 'Generating questions with AI...', icon: '🧑‍💻', progress: 25 },
            'creating-quiz': { label: 'Creating quiz in BrainBurst...', icon: '📝', progress: 60 },
            'creating-room': { label: 'Setting up your game room...', icon: '🏠', progress: 85 },
            'done': { label: 'Game ready! Launching...', icon: '🚀', progress: 100 }
        };
        return steps[step] || { label: '', icon: '', progress: 0 };
    };

    const isCreating = ['generating', 'creating-quiz', 'creating-room'].includes(creationStep);

    return (
        <>
            {/* Edge Tab — visible when sidebar is closed */}
            {!isOpen && (
                <button
                    id="ai-agent-edge-tab"
                    className="ai-agent-edge-tab"
                    onClick={() => setIsOpen(true)}
                    aria-label="Open AI Agent"
                >
                    <span className="edge-tab-icon">🧑‍💻</span>
                    <span className="edge-tab-label">AI</span>
                </button>
            )}

            {/* Sidebar Panel */}
            <div className={`ai-agent-sidebar ${isOpen ? 'open' : ''}`}>
                {/* Header */}
                <div className="ai-agent-header">
                    <div className="ai-agent-avatar">🧑‍💻</div>
                    <div className="ai-agent-header-info">
                        <h3>BrainBurst AI</h3>
                        <div className="agent-status">
                            <span className="agent-status-dot" />
                            Online • Powered by Llama 3.3
                        </div>
                    </div>
                    <button className="ai-agent-close" onClick={() => setIsOpen(false)}>✕</button>
                </div>

                {/* Mode Tabs */}
                <div className="ai-agent-tabs">
                    <button
                        className={`ai-tab ${activeMode === 'chat' ? 'active' : ''}`}
                        onClick={() => setActiveMode('chat')}
                    >
                        💬 Chat
                    </button>
                    <button
                        className={`ai-tab ${activeMode === 'setup' ? 'active' : ''}`}
                        onClick={() => setActiveMode('setup')}
                    >
                        ⚡ AI Quiz Game
                    </button>
                </div>

                {/* CHAT MODE */}
                {activeMode === 'chat' && (
                    <>
                        <div className="ai-agent-messages">
                            {messages.length === 0 && (
                                <div className="ai-welcome">
                                    <div className="ai-welcome-icon">🧑‍🏫</div>
                                    <h4>Hey there! I'm BrainBurst AI</h4>
                                    <p>
                                        I can help you learn, explain concepts, suggest quiz strategies, 
                                        and even generate quiz questions. Ask me anything!
                                    </p>
                                </div>
                            )}

                            {messages.map((msg, i) => (
                                <div key={i} className={`ai-message ${msg.role}`}>
                                    <div className="msg-avatar">
                                        {msg.role === 'assistant' ? '🧑‍💻' : '👤'}
                                    </div>
                                    <div>
                                        <div className="msg-bubble"
                                            dangerouslySetInnerHTML={{
                                                __html: formatMessage(msg.content)
                                            }}
                                        />
                                        <div className="msg-time">{formatTime(msg.timestamp)}</div>
                                    </div>
                                </div>
                            ))}

                            {isTyping && (
                                <div className="typing-indicator">
                                    <div className="msg-avatar">🧑‍💻</div>
                                    <div className="typing-dots">
                                        <span /><span /><span />
                                    </div>
                                </div>
                            )}

                            {error && (
                                <div className="ai-error-msg">⚠️ {error}</div>
                            )}

                            <div ref={messagesEndRef} />
                        </div>

                        {/* Quick Actions */}
                        {messages.length === 0 && (
                            <div className="ai-quick-actions">
                                {quickActions.map((action, i) => (
                                    <button
                                        key={i}
                                        className="quick-action-chip"
                                        onClick={() => handleQuickAction(action.prompt)}
                                    >
                                        {action.label}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Input Area */}
                        <div className="ai-agent-input">
                            <div className="ai-input-wrapper">
                                <textarea
                                    ref={textareaRef}
                                    value={inputValue}
                                    onInput={handleTextareaInput}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Ask me anything..."
                                    rows={1}
                                    disabled={isTyping}
                                />
                                <button
                                    className="ai-send-btn"
                                    onClick={handleSendMessage}
                                    disabled={!inputValue.trim() || isTyping}
                                    aria-label="Send message"
                                >
                                    ➤
                                </button>
                            </div>
                        </div>
                    </>
                )}

                {/* QUIZ SETUP MODE — Auto-Create Game */}
                {activeMode === 'setup' && (
                    <div className="quiz-setup-panel">

                        {/* Setup Form (when not creating) */}
                        {creationStep === 'idle' && (
                            <>
                                <div className={`setup-step ${setupConfig.topic ? 'completed' : ''}`}>
                                    <div className="setup-step-header">
                                        <span className="step-number">1</span>
                                        <span className="step-label">Quiz Topic</span>
                                    </div>
                                    <input
                                        type="text"
                                        className="form-input"
                                        placeholder="e.g., Core Java, World History, Physics..."
                                        value={setupConfig.topic}
                                        onChange={(e) => setSetupConfig(prev => ({ ...prev, topic: e.target.value }))}
                                    />
                                </div>

                                <div className="setup-step completed">
                                    <div className="setup-step-header">
                                        <span className="step-number">2</span>
                                        <span className="step-label">Number of Questions</span>
                                    </div>
                                    <select
                                        className="form-select"
                                        value={setupConfig.questionCount}
                                        onChange={(e) => setSetupConfig(prev => ({ ...prev, questionCount: parseInt(e.target.value) }))}
                                    >
                                        <option value={3}>3 Questions</option>
                                        <option value={5}>5 Questions</option>
                                        <option value={10}>10 Questions</option>
                                        <option value={15}>15 Questions</option>
                                        <option value={20}>20 Questions</option>
                                    </select>
                                </div>

                                <div className="setup-step completed">
                                    <div className="setup-step-header">
                                        <span className="step-number">3</span>
                                        <span className="step-label">Difficulty Level</span>
                                    </div>
                                    <select
                                        className="form-select"
                                        value={setupConfig.difficulty}
                                        onChange={(e) => setSetupConfig(prev => ({ ...prev, difficulty: e.target.value }))}
                                    >
                                        <option>Easy</option>
                                        <option>Medium</option>
                                        <option>Hard</option>
                                    </select>
                                </div>

                                <div className="setup-step completed">
                                    <div className="setup-step-header">
                                        <span className="step-number">4</span>
                                        <span className="step-label">Time per Question (seconds)</span>
                                    </div>
                                    <select
                                        className="form-select"
                                        value={setupConfig.timePerQuestion}
                                        onChange={(e) => setSetupConfig(prev => ({ ...prev, timePerQuestion: parseInt(e.target.value) }))}
                                    >
                                        <option value={15}>15 seconds</option>
                                        <option value={20}>20 seconds</option>
                                        <option value={30}>30 seconds</option>
                                        <option value={45}>45 seconds</option>
                                        <option value={60}>60 seconds</option>
                                    </select>
                                </div>

                                {error && <div className="ai-error-msg">⚠️ {error}</div>}

                                {/* Main Action Button */}
                                <button
                                    className="auto-create-btn"
                                    onClick={handleAutoCreateGame}
                                    disabled={!setupConfig.topic.trim()}
                                >
                                    <span className="auto-create-icon">🎮</span>
                                    <span className="auto-create-text">
                                        <strong>Generate & Start Game</strong>
                                        <small>AI will create questions and launch a game room</small>
                                    </span>
                                </button>
                            </>
                        )}

                        {/* Creation Progress */}
                        {isCreating && (
                            <div className="creation-progress">
                                <div className="creation-progress-header">
                                    <span className="creation-title">🎮 Creating Your Game</span>
                                    <span className="creation-topic">{setupConfig.topic}</span>
                                </div>

                                {/* Progress Bar */}
                                <div className="creation-progress-bar">
                                    <div 
                                        className="creation-progress-fill"
                                        style={{ width: `${getStepStatus(creationStep).progress}%` }}
                                    />
                                </div>

                                {/* Step Indicators */}
                                <div className="creation-steps">
                                    <div className={`creation-step ${creationStep === 'generating' ? 'active' : ''} ${['creating-quiz', 'creating-room', 'done'].includes(creationStep) ? 'done' : ''}`}>
                                        <span className="creation-step-icon">🧑‍💻</span>
                                        <span className="creation-step-label">Generating Questions</span>
                                        {creationStep === 'generating' && <div className="mini-spinner" />}
                                        {['creating-quiz', 'creating-room', 'done'].includes(creationStep) && <span className="check-mark">✓</span>}
                                    </div>
                                    <div className={`creation-step ${creationStep === 'creating-quiz' ? 'active' : ''} ${['creating-room', 'done'].includes(creationStep) ? 'done' : ''}`}>
                                        <span className="creation-step-icon">📝</span>
                                        <span className="creation-step-label">Creating Quiz</span>
                                        {creationStep === 'creating-quiz' && <div className="mini-spinner" />}
                                        {['creating-room', 'done'].includes(creationStep) && <span className="check-mark">✓</span>}
                                    </div>
                                    <div className={`creation-step ${creationStep === 'creating-room' ? 'active' : ''} ${creationStep === 'done' ? 'done' : ''}`}>
                                        <span className="creation-step-icon">🏠</span>
                                        <span className="creation-step-label">Setting Up Room</span>
                                        {creationStep === 'creating-room' && <div className="mini-spinner" />}
                                        {creationStep === 'done' && <span className="check-mark">✓</span>}
                                    </div>
                                </div>

                                {/* Current Status */}
                                <div className="creation-status">
                                    <span className="creation-status-icon">{getStepStatus(creationStep).icon}</span>
                                    <span className="creation-status-text">{getStepStatus(creationStep).label}</span>
                                </div>

                                {generatedQuestions && (
                                    <div className="creation-question-count">
                                        ✅ {generatedQuestions.length} questions generated
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Success State */}
                        {creationStep === 'done' && (
                            <div className="creation-success">
                                <div className="success-icon-large">🎉</div>
                                <h3 className="success-title">Game Ready!</h3>
                                <p className="success-subtitle">
                                    Your AI-generated <strong>{setupConfig.topic}</strong> quiz is live!
                                </p>
                                {createdRoomCode && (
                                    <div className="success-room-code">
                                        <span className="room-code-label">Room Code</span>
                                        <span className="room-code-value">{createdRoomCode}</span>
                                    </div>
                                )}
                                <div className="success-actions">
                                    <button className="btn btn-primary" onClick={handleGoToRoom}>
                                        🎮 Enter Game Room
                                    </button>
                                    <button className="btn btn-outline" onClick={handleResetSetup} style={{ marginTop: '0.5rem' }}>
                                        Create Another Quiz
                                    </button>
                                </div>
                                {generatedQuestions && (
                                    <button
                                        onClick={handleCopyQuestions}
                                        className="copy-json-btn"
                                    >
                                        📋 Copy Questions JSON
                                    </button>
                                )}
                            </div>
                        )}

                        {/* Error during creation */}
                        {creationStep === 'idle' && error && !isCreating && (
                            <div className="ai-error-msg" style={{ marginTop: '0.5rem' }}>⚠️ {error}</div>
                        )}
                    </div>
                )}
            </div>
        </>
    );
};

export default AIAgent;

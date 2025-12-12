import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { quizAPI } from '../services/api';
import * as XLSX from 'xlsx';
import './CreateQuiz.css';

const CreateQuiz = () => {
    const navigate = useNavigate();
    const fileInputRef = useRef(null);
    const [quizData, setQuizData] = useState({
        title: '',
        description: '',
        category: 'General Knowledge',
        difficulty: 'Medium'
    });
    const [questions, setQuestions] = useState([
        {
            question: '',
            options: ['', '', '', ''],
            correctAnswer: 0,
            points: 10,
            timeLimit: 30
        }
    ]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleQuizDataChange = (e) => {
        setQuizData({
            ...quizData,
            [e.target.name]: e.target.value
        });
    };

    const handleQuestionChange = (index, field, value) => {
        const newQuestions = [...questions];
        newQuestions[index][field] = value;
        setQuestions(newQuestions);
    };

    const handleOptionChange = (questionIndex, optionIndex, value) => {
        const newQuestions = [...questions];
        newQuestions[questionIndex].options[optionIndex] = value;
        setQuestions(newQuestions);
    };

    const addQuestion = () => {
        setQuestions([
            ...questions,
            {
                question: '',
                options: ['', '', '', ''],
                correctAnswer: 0,
                points: 10,
                timeLimit: 30
            }
        ]);
    };

    const removeQuestion = (index) => {
        if (questions.length > 1) {
            setQuestions(questions.filter((_, i) => i !== index));
        }
    };

    const handleImportSpreadsheet = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = new Uint8Array(event.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet);

                if (jsonData.length === 0) {
                    setError('The spreadsheet is empty. Please add questions.');
                    return;
                }

                const importedQuestions = jsonData.map((row, index) => {
                    const question = row.Question || row.question || '';
                    const option1 = row.Option1 || row.option1 || '';
                    const option2 = row.Option2 || row.option2 || '';
                    const option3 = row.Option3 || row.option3 || '';
                    const option4 = row.Option4 || row.option4 || '';
                    const correctAnswer = parseInt(row.CorrectAnswer || row.correctAnswer || row.CorrectOption || row.correctOption || 1) - 1;
                    const points = parseInt(row.Points || row.points || 10);
                    const timeLimit = parseInt(row.TimeLimit || row.timeLimit || row.Time || row.time || 30);

                    if (!question) {
                        throw new Error(`Row ${index + 1}: Question is required`);
                    }

                    if (!option1 || !option2 || !option3 || !option4) {
                        throw new Error(`Row ${index + 1}: All 4 options are required`);
                    }

                    return {
                        question,
                        options: [option1, option2, option3, option4],
                        correctAnswer: Math.max(0, Math.min(3, correctAnswer)), 
                        points: Math.max(1, Math.min(100, points)),
                        timeLimit: Math.max(10, Math.min(300, timeLimit))
                    };
                });

                setQuestions(importedQuestions);
                setError('');
                alert(`Successfully imported ${importedQuestions.length} questions!`);
            } catch (err) {
                setError(`Import failed: ${err.message}`);
            }
        };

        reader.readAsArrayBuffer(file);
        e.target.value = '';
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        if (!quizData.title.trim()) {
            setError('Quiz title is required');
            setLoading(false);
            return;
        }

        for (let i = 0; i < questions.length; i++) {
            const q = questions[i];
            if (!q.question.trim()) {
                setError(`Question ${i + 1} is empty`);
                setLoading(false);
                return;
            }
            if (q.options.some(opt => !opt.trim())) {
                setError(`All options for question ${i + 1} must be filled`);
                setLoading(false);
                return;
            }
        }

        try {
            await quizAPI.createQuiz({
                ...quizData,
                questions
            });
            navigate('/dashboard');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to create quiz');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="create-quiz-page">
            <div className="container">
                <div className="create-quiz-header">
                    <button onClick={() => navigate('/dashboard')} className="btn btn-outline">
                        ← Back to Dashboard
                    </button>
                    <h1>Create New Quiz</h1>
                </div>

                {error && (
                    <div className="alert alert-error">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="create-quiz-form">
                    <div className="card">
                        <h2>Quiz Details</h2>
                        <div className="form-grid">
                            <div className="form-group">
                                <label className="form-label">Quiz Title *</label>
                                <input
                                    type="text"
                                    name="title"
                                    className="form-input"
                                    placeholder="Enter quiz title"
                                    value={quizData.title}
                                    onChange={handleQuizDataChange}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Category *</label>
                                <select
                                    name="category"
                                    className="form-select"
                                    value={quizData.category}
                                    onChange={handleQuizDataChange}
                                    required
                                >
                                    <option>General Knowledge</option>
                                    <option>Science</option>
                                    <option>History</option>
                                    <option>Geography</option>
                                    <option>Sports</option>
                                    <option>Entertainment</option>
                                    <option>Technology</option>
                                    <option>Mathematics</option>
                                    <option>Other</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Difficulty *</label>
                                <select
                                    name="difficulty"
                                    className="form-select"
                                    value={quizData.difficulty}
                                    onChange={handleQuizDataChange}
                                    required
                                >
                                    <option>Easy</option>
                                    <option>Medium</option>
                                    <option>Hard</option>
                                </select>
                            </div>

                            <div className="form-group full-width">
                                <label className="form-label">Description</label>
                                <textarea
                                    name="description"
                                    className="form-textarea"
                                    placeholder="Brief description of your quiz"
                                    value={quizData.description}
                                    onChange={handleQuizDataChange}
                                    rows={3}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="questions-section">
                        <div className="section-header">
                            <h2>Questions ({questions.length})</h2>
                            <div className="section-actions">
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleImportSpreadsheet}
                                    accept=".xlsx,.xls,.csv"
                                    style={{ display: 'none' }}
                                />
                                <button
                                    type="button"
                                    onClick={handleImportClick}
                                    className="btn btn-secondary"
                                    title="Import questions from Excel/CSV file"
                                >
                                    📊 Import from Spreadsheet
                                </button>
                                <button type="button" onClick={addQuestion} className="btn btn-primary">
                                    + Add Question
                                </button>
                            </div>
                        </div>

                        <div className="import-info-box">
                            <div className="info-icon">ℹ️</div>
                            <div className="info-content">
                                <strong>Spreadsheet Format:</strong> Your Excel/CSV file should have columns:
                                <code>Question</code>, <code>Option1</code>, <code>Option2</code>, <code>Option3</code>,
                                <code>Option4</code>, <code>CorrectAnswer</code> (1-4), <code>Points</code>, <code>TimeLimit</code>.
                                <br />
                                <div className="template-links">
                                    <a href="/quiz-template.xlsx" download className="template-link">
                                        📥 Download Excel Template
                                    </a>
                                    <span className="template-separator">or</span>
                                    <a href="/quiz-template.csv" download className="template-link">
                                        📥 Download CSV Template
                                    </a>
                                </div>
                            </div>
                        </div>

                        {questions.map((question, qIndex) => (
                            <div key={qIndex} className="question-card card">
                                <div className="question-header">
                                    <h3>Question {qIndex + 1}</h3>
                                    {questions.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={() => removeQuestion(qIndex)}
                                            className="btn-remove"
                                        >
                                            ✕
                                        </button>
                                    )}
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Question Text *</label>
                                    <textarea
                                        className="form-textarea"
                                        placeholder="Enter your question"
                                        value={question.question}
                                        onChange={(e) => handleQuestionChange(qIndex, 'question', e.target.value)}
                                        required
                                        rows={2}
                                    />
                                </div>

                                <div className="options-grid">
                                    {question.options.map((option, oIndex) => (
                                        <div key={oIndex} className="option-group">
                                            <label className="form-label">
                                                Option {oIndex + 1} *
                                                {question.correctAnswer === oIndex && (
                                                    <span className="correct-badge">✓ Correct</span>
                                                )}
                                            </label>
                                            <div className="option-input-group">
                                                <input
                                                    type="text"
                                                    className="form-input"
                                                    placeholder={`Option ${oIndex + 1}`}
                                                    value={option}
                                                    onChange={(e) => handleOptionChange(qIndex, oIndex, e.target.value)}
                                                    required
                                                />
                                                <button
                                                    type="button"
                                                    className={`btn-select-correct ${question.correctAnswer === oIndex ? 'selected' : ''
                                                        }`}
                                                    onClick={() => handleQuestionChange(qIndex, 'correctAnswer', oIndex)}
                                                    title="Mark as correct answer"
                                                >
                                                    ✓
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="question-settings">
                                    <div className="form-group">
                                        <label className="form-label">Points</label>
                                        <input
                                            type="number"
                                            className="form-input"
                                            value={question.points}
                                            onChange={(e) => handleQuestionChange(qIndex, 'points', parseInt(e.target.value))}
                                            min={1}
                                            max={100}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Time Limit (seconds)</label>
                                        <input
                                            type="number"
                                            className="form-input"
                                            value={question.timeLimit}
                                            onChange={(e) => handleQuestionChange(qIndex, 'timeLimit', parseInt(e.target.value))}
                                            min={10}
                                            max={300}
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="form-actions">
                        <button type="button" onClick={() => navigate('/dashboard')} className="btn btn-outline">
                            Cancel
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={loading}>
                            {loading ? 'Creating Quiz...' : 'Create Quiz'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateQuiz;

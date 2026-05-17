const rateLimit = require('express-rate-limit');

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

// Stricter rate limit for AI endpoints (expensive API calls)
const aiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 30, // 30 AI requests per 15 min per IP
    message: { error: 'Too many AI requests, please wait before trying again.' }
});

// Chat completion proxy — keeps API key server-side
const chat = async (req, res) => {
    try {
        const apiKey = process.env.GROQ_API_KEY;
        if (!apiKey) {
            return res.status(503).json({ message: 'AI service is not configured' });
        }

        const { messages, max_tokens, temperature } = req.body;

        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            return res.status(400).json({ message: 'Messages array is required' });
        }

        // Validate message format
        for (const msg of messages) {
            if (!msg.role || !msg.content) {
                return res.status(400).json({ message: 'Each message must have role and content' });
            }
            if (!['system', 'user', 'assistant'].includes(msg.role)) {
                return res.status(400).json({ message: 'Invalid message role' });
            }
        }

        const response = await fetch(GROQ_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                max_tokens: Math.min(max_tokens || 2048, 4096), // Cap at 4096
                temperature: Math.min(Math.max(temperature || 0.7, 0), 2), // Clamp 0-2
                messages
            })
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            console.error('Groq API error:', response.status, errData?.error?.message);
            return res.status(502).json({ message: 'AI service temporarily unavailable' });
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || 'No response generated.';

        res.json({ content });
    } catch (error) {
        console.error('AI chat error:', error.message);
        res.status(500).json({ message: 'Server error processing AI request' });
    }
};

module.exports = {
    chat,
    aiLimiter,
};

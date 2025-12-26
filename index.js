const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// MapleAI Configuration
const MAPLE_API_URL = 'https://api.mapleai.de/v1/chat/completions';
const MAPLE_API_KEY = process.env.MAPLE_API_KEY || 'sk-mapleai-1CgWDOBjGiMlKD9GEySEuStZDUs4EUgd17hAamhToNAe33aXTBhi7LyA7ZTeSVcW4P6k52aYkcbDt2BY';

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/', (req, res) => {
    res.json({ 
        status: 'online', 
        message: 'Roblox MapleAI Backend is running',
        endpoints: {
            chat: 'POST /chat',
            health: 'GET /'
        }
    });
});

// Main chat endpoint for Roblox
app.post('/chat', async (req, res) => {
    try {
        const { message, playerName, context, systemPrompt } = req.body;

        // Validate required fields
        if (!message) {
            return res.status(400).json({ 
                success: false, 
                error: 'Message is required' 
            });
        }

        // Build the messages array for MapleAI
        const messages = [];

        // Add system prompt if provided, otherwise use a default
        const defaultSystemPrompt = `You are a helpful NPC in a Roblox game. You're friendly, engaging, and stay in character. Keep responses concise and appropriate for all ages.`;
        
        messages.push({
            role: 'system',
            content: systemPrompt || defaultSystemPrompt
        });

        // Add context if provided (previous conversation history)
        if (context && Array.isArray(context)) {
            messages.push(...context);
        }

        // Add the current user message
        const userMessage = playerName 
            ? `[${playerName}]: ${message}` 
            : message;
        
        messages.push({
            role: 'user',
            content: userMessage
        });

        // Send request to MapleAI
        const response = await axios.post(
            MAPLE_API_URL,
            {
                model: 'gpt-4o-mini',
                messages: messages,
                max_tokens: 500,
                temperature: 0.7
            },
            {
                headers: {
                    'Authorization': `Bearer ${MAPLE_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                timeout: 30000
            }
        );

        // Extract the AI response
        const aiMessage = response.data.choices[0]?.message?.content || 'I have nothing to say.';

        // Send back to Roblox
        res.json({
            success: true,
            message: aiMessage,
            usage: response.data.usage || null
        });

    } catch (error) {
        console.error('MapleAI Error:', error.response?.data || error.message);
        
        // Handle different error types
        if (error.response) {
            // API returned an error
            res.status(error.response.status).json({
                success: false,
                error: error.response.data?.error?.message || 'MapleAI API error',
                code: error.response.status
            });
        } else if (error.code === 'ECONNABORTED') {
            // Timeout
            res.status(504).json({
                success: false,
                error: 'Request timed out',
                code: 504
            });
        } else {
            // Other errors
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                code: 500
            });
        }
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Backend running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/`);
    console.log(`Chat endpoint: POST http://localhost:${PORT}/chat`);
});
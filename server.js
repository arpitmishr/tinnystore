// server.js - CORRECTED AND FINAL VERSION

const express = require('express');
const fetch = require('node-fetch');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = 3000;

// --- Middleware ---
// 1. To parse incoming JSON from the browser
app.use(express.json());
// 2. To serve static files like CSS or images if you add them later
app.use(express.static(__dirname));

// --- API Route ---
// This will ONLY handle POST requests to "/api/chat"
app.post('/api/chat', async (req, res) => {
  const { messages } = req.body;

  const apiKey = process.env.GOOGLE_GEMINI_API_KEY; // Corrected variable name from your .env
  if (!apiKey) {
    return res.status(500).json({ error: { message: 'Google Gemini API key not configured on the server.' } });
  }

  const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`;

  try {
    const geminiRequestBody = {
      contents: transformMessagesToGemini(messages),
    };

    const response = await fetch(geminiEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(geminiRequestBody),
    });

    const data = await response.json();

    if (!response.ok) {
        const errorMessage = data?.error?.message || 'An error occurred with the Gemini API.';
        return res.status(response.status).json({ error: { message: errorMessage }});
    }

    if (!data.candidates || data.candidates.length === 0 || !data.candidates[0].content) {
        return res.status(200).json({ 
            choices: [{ message: { content: "I could not generate a response. The prompt may have been blocked for safety reasons." } }]
        });
    }

    const geminiResponseText = data.candidates[0].content.parts[0].text;
    
    // Transform the Gemini response back into the OpenAI format the frontend expects
    const openAIStyleResponse = {
        choices: [{ message: { content: geminiResponseText } }]
    };

    res.json(openAIStyleResponse);

  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ error: { message: 'Failed to communicate with the Google Gemini API.' } });
  }
});


// --- Frontend Route ---
// This serves your main index.html file for any GET request that isn't for a static file
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});


// --- Helper Function ---
function transformMessagesToGemini(messages) {
  const contents = [];
  let systemPrompt = "";

  const systemMessage = messages.find(m => m.role === 'system');
  if (systemMessage) {
    systemPrompt = systemMessage.content + "\n\n";
  }

  messages.filter(m => m.role !== 'system').forEach((msg, index) => {
    const role = msg.role === 'user' ? 'user' : 'model';
    const text = (index === 0 && msg.role === 'user') ? systemPrompt + msg.content : msg.content;
    contents.push({ role: role, parts: [{ text: text }] });
  });
  return contents;
}


// --- Start Server ---
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

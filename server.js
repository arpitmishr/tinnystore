// server.js - Updated for Google Gemini API

const express = require('express');
const fetch = require('node-fetch');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, '/')));

// This function transforms the OpenAI-style messages to Gemini-style contents
function transformMessagesToGemini(messages) {
  const contents = [];
  let currentSystemPrompt = "";

  // Gemini works best with a system prompt prepended to the first user message.
  const systemMessage = messages.find(m => m.role === 'system');
  if (systemMessage) {
    currentSystemPrompt = systemMessage.content + "\n\n";
  }

  messages.filter(m => m.role !== 'system').forEach((msg, index) => {
    // Map 'assistant' role to 'model' for Gemini
    const role = msg.role === 'user' ? 'user' : 'model';
    
    // Prepend the system prompt to the first user message
    const text = (index === 0 && msg.role === 'user') 
        ? currentSystemPrompt + msg.content 
        : msg.content;

    contents.push({
      role: role,
      parts: [{ text: text }],
    });
  });
  return contents;
}


// Secure API endpoint for handling chat requests
app.post('/api/chat', async (req, res) => {
  const { messages } = req.body;

  const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: { message: 'Google Gemini API key not configured on the server.' } });
  }

  const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`;

  try {
    const geminiRequestBody = {
      contents: transformMessagesToGemini(messages),
      // Optional: Add safety settings if needed
      // safetySettings: [ ... ]
    };

    const response = await fetch(geminiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(geminiRequestBody),
    });

    const data = await response.json();

    if (!response.ok) {
        // If Google returns an error, pass its message along
        const errorMessage = data?.error?.message || 'An error occurred with the Gemini API.';
        return res.status(response.status).json({ error: { message: errorMessage }});
    }

    // Check if the response was blocked or had no content
    if (!data.candidates || data.candidates.length === 0 || !data.candidates[0].content) {
        return res.status(200).json({ 
            choices: [{ message: { content: "I could not generate a response. The prompt may have been blocked for safety reasons." } }]
        });
    }

    // Extract the response text
    const geminiResponseText = data.candidates[0].content.parts[0].text;
    
    // IMPORTANT: Transform the Gemini response BACK into the OpenAI format
    // that the frontend is expecting.
    const openAIStyleResponse = {
        choices: [
            {
                message: {
                    content: geminiResponseText
                }
            }
        ]
    };

    res.json(openAIStyleResponse);

  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ error: { message: 'Failed to communicate with the Google Gemini API.' } });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

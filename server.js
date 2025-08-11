// Import necessary packages
const express = require('express');
const fetch = require('node-fetch');
const path = require('path');

// Load environment variables from the .env file
require('dotenv').config();

const app = express();
const PORT = 3000;

// Middleware to parse JSON bodies and serve static files from the root directory
app.use(express.json());
app.use(express.static(path.join(__dirname, '/')));

// This is our secure API endpoint (the "proxy")
app.post('/api/chat', async (req, res) => {
  const { messages } = req.body;

  // Retrieve the secret API key from environment variables
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured on the server.' });
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: messages,
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
        // If OpenAI returns an error, pass it along
        return res.status(response.status).json(data);
    }

    res.json(data);

  } catch (error) {
    res.status(500).json({ error: 'Failed to communicate with OpenAI API.' });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

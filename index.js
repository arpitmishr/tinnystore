const functions = require('@google-cloud/functions-framework');
const fetch = require('node-fetch');

// This function will be triggered by HTTP requests.
functions.http('getAiForecast', async (req, res) => {
  // Set CORS headers to allow requests from your website
  res.set('Access-Control-Allow-Origin', '*'); // For production, replace '*' with your actual website domain
  res.set('Access-Control-Allow-Methods', 'POST');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests for CORS
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  // Retrieve your secret API key from environment variables.
  // NEVER hardcode the key here.
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_API_KEY) {
    res.status(500).send('API key is not configured on the server.');
    return;
  }
  
  // The Gemini API endpoint
  const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`;

  try {
    const { prompt } = req.body;
    if (!prompt) {
      res.status(400).send('Request body must contain a "prompt".');
      return;
    }
    
    // Construct the payload for the Gemini API
    const payload = {
      contents: [{
        parts: [{ text: prompt }]
      }],
      generationConfig: {
        // Ensure the model outputs JSON
        response_mime_type: "application/json",
      }
    };

    // Forward the request to the Google AI API
    const apiResponse = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!apiResponse.ok) {
        const errorText = await apiResponse.text();
        throw new Error(`Google AI API responded with status ${apiResponse.status}: ${errorText}`);
    }

    const data = await apiResponse.json();
    
    // Send the AI's response back to your frontend website
    res.status(200).send(data.candidates[0].content.parts[0].text);

  } catch (error) {
    console.error('Error proxying to Google AI API:', error);
    res.status(500).send('An internal server error occurred.');
  }
});

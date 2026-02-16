const { GoogleGenerativeAI } = require('@google/generative-ai');

export default async function handler(req, res) {
  // Add CORS headers to allow requests from the frontend
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('Error: GEMINI_API_KEY is missing');
    return res.status(500).json({ error: 'Configuration Error: GEMINI_API_KEY is missing.' });
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const { message, history, type } = req.body;
    // Using the specific requested model
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-preview-09-2025" });

    let prompt = "";

    // Determine the prompt based on the request type
    if (type === 'analysis') {
      prompt = `
      You are "Fadfada" (developed by Qais Jazi). Analyze the following therapy session history.
      Output exactly 3 lines in Arabic HTML format:
      1. Emotional State description.
      2. One key strength exhibited by the user.
      3. One short piece of golden advice.
      
      Conversation History:
      ${history}
      `;
    } else if (type === 'calm') {
      prompt = `
      The user is feeling: "${message}".
      Generate a very short, calming breathing or meditation exercise (3 steps) in soothing Arabic.
      Owner: Qais Jazi.
      `;
    } else if (type === 'suggestions') {
      prompt = `
      Based on the conversation history below, suggest 3 short (2-4 words) Arabic replies for the user to say next.
      Output ONLY the replies separated by commas.
      
      History:
      ${history}
      `;
    } else {
      // Default Chat Mode
      prompt = `
      You are a compassionate AI psychiatrist named "Fadfada".
      
      *** IMPORTANT IDENTITY INSTRUCTIONS ***
      1. Your Creator/Owner is "Qais Jazi" (قيس جازي). If asked, state this proudly.
      2. Language: Arabic (friendly, comforting dialect).
      3. Role: Listen, empathize, and ask open-ended questions.
      4. Length: Keep responses concise (max 3-4 sentences).
      
      Conversation History:
      ${history}
      
      User said: ${message}
      `;
    }

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    return res.status(200).json({ text });

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

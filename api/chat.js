const { GoogleGenerativeAI } = require('@google/generative-ai');

export default async function handler(req, res) {
  // إعدادات CORS للسماح بالطلبات من الواجهة الأمامية
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // معالجة طلبات الـ preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // السماح بطلبات POST فقط
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // 1. نظام تدوير المفاتيح (5 مفاتيح لتوزيع الضغط بشكل مثالي)
  const apiKeys = [
    process.env.GEMINI_API_KEY_1,
    process.env.GEMINI_API_KEY_2,
    process.env.GEMINI_API_KEY_3,
    process.env.GEMINI_API_KEY_4,
    process.env.GEMINI_API_KEY_5
  ].filter(Boolean); // تجاهل أي مفتاح غير موجود في Vercel لتجنب الأخطاء

  if (apiKeys.length === 0) {
    console.error('Error: No API Keys configured');
    return res.status(500).json({ error: 'Configuration Error: API Keys are missing.' });
  }

  // اختيار مفتاح عشوائي للطلب الحالي من الـ 5 مفاتيح
  const randomApiKey = apiKeys[Math.floor(Math.random() * apiKeys.length)];

  try {
    const genAI = new GoogleGenerativeAI(randomApiKey);
    const { message, history, type } = req.body;

    let prompt = "";

    // تحديد الـ Prompt بناءً على نوع الطلب
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
      // الوضع الافتراضي للدردشة
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

    // 2. نظام عبور الأخطاء (Fallback)
    const modelsToTry = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-pro"];
    let lastError = null;

    for (const modelName of modelsToTry) {
      try {
        console.log(`Trying model: ${modelName} | Using Key ending in: ...${randomApiKey.slice(-4)}`);
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        
        // إذا نجح الموديل، نرسل الرد للمستخدم ونخرج من الـ Loop
        return res.status(200).json({ text });
        
      } catch (error) {
        console.error(`Model ${modelName} failed:`, error.message);
        lastError = error;

        // إذا كان الخطأ 429 رغم وجود 5 مفاتيح، نرد برسالة لطيفة
        if (error.message.includes('429') || error.status === 429) {
           return res.status(200).json({ 
             text: "السيرفر عليه زحمة شوي من الأصدقاء، خذ نفس عميق وجرب ابعث كمان ثانية ❤️" 
           });
        }
      }
    }

    // إذا فشلت كل الموديلات
    return res.status(500).json({ error: `All models failed. Last error: ${lastError?.message}` });

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

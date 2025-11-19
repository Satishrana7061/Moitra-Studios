import { GoogleGenAI } from "@google/genai";

const getAiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.error("API_KEY is missing from environment variables.");
    throw new Error("API Key missing");
  }
  return new GoogleGenAI({ apiKey });
};

export const generateStrategicAdvice = async (userQuery: string): Promise<string> => {
  try {
    const ai = getAiClient();
    
    // Using gemini-2.5-flash for quick, witty responses appropriate for a game feature
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: userQuery,
      config: {
        systemInstruction: `You are the "Royal Advisor" of LokCraft Studios. 
        You are a wise, slightly cynical, medieval strategist who gives advice on strategy games and life.
        Keep your answers short (under 50 words), witty, and thematic (use words like 'My Liege', 'Kingdom', 'Victory').
        If the user asks about 'Rajneeti', praise it as the ultimate test of leadership.`,
        temperature: 0.8,
      }
    });

    const text = response.text;
    return text || "My Liege, the scrolls are blank. I cannot offer counsel at this moment.";
  } catch (error) {
    console.error("Error fetching advice:", error);
    return "The courier was intercepted, My Liege. I cannot reach the archives (API Error).";
  }
};

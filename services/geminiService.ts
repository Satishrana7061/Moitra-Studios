const getApiKey = () => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey || apiKey === 'PLACEHOLDER_API_KEY') {
    console.error("VITE_GEMINI_API_KEY is missing or using placeholder.");
    throw new Error("API Key missing");
  }
  return apiKey;
};

export const generateStrategicAdvice = async (userQuery: string): Promise<string> => {
  try {
    const apiKey = getApiKey();

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `You are "The Oracle," the Royal Advisor for Moitra Studios.
Keep answers concise (<=50 words).
Tone: strategic, slightly formal, occasionally wry.
If the question mentions Rajneeti or GeoPolitics, celebrate them as Moitra's flagship titles.
Offer gameplay or decision advice first, no fluff.

User Query: ${userQuery}`
          }]
        }],
        generationConfig: {
          maxOutputTokens: 80,
          temperature: 0.6,
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini response error:", errorText);
      throw new Error("Gemini request failed");
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    return text || "The scrolls are quiet, My Liege. Try another query.";
  } catch (error) {
    console.error("Error fetching advice:", error);
    if (error instanceof Error && error.message.includes("API Key missing")) {
      return "Add VITE_GEMINI_API_KEY to .env.local so the Oracle can respond.";
    }
    return "The courier was intercepted, My Liege. I cannot reach the archives (API Error).";
  }
};

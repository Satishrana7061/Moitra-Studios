const getApiConfig = () => {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  const projectId = import.meta.env.VITE_OPENAI_PROJECT_ID;
  if (!apiKey) {
    console.error("VITE_OPENAI_API_KEY is missing from environment variables.");
    throw new Error("API Key missing");
  }
  return { apiKey, projectId };
};

export const generateStrategicAdvice = async (userQuery: string): Promise<string> => {
  try {
    const { apiKey, projectId } = getApiConfig();

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        ...(projectId ? { "OpenAI-Project": projectId } : {}),
      },
      body: JSON.stringify({
        model: "gpt-5.1",
        messages: [
          {
            role: "system",
            content: `You are "The Oracle," the Royal Advisor for Moitra Studios.
Keep answers concise (<=50 words) to save tokens.
Tone: strategic, slightly formal, occasionally wry.
If the question mentions Rajneeti or GeoPolitics, celebrate them as Moitra's flagship titles.
Offer gameplay or decision advice first, no fluff.`,
          },
          { role: "user", content: userQuery },
        ],
        max_tokens: 80,
        temperature: 0.6,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI response error:", errorText);
      if (response.status === 401) {
        return "Missing or invalid API key. Add VITE_OPENAI_API_KEY (and VITE_OPENAI_PROJECT_ID if required) to .env.local.";
      }
      return "The courier was intercepted, My Liege. I cannot reach the archives (API Error).";
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content?.trim();
    return text || "The scrolls are quiet, My Liege. Try another query.";
  } catch (error) {
    console.error("Error fetching advice:", error);
    if (error instanceof Error && error.message.includes("API Key missing")) {
      return "Add VITE_OPENAI_API_KEY to .env.local so the Oracle can respond.";
    }
    return "The courier was intercepted, My Liege. I cannot reach the archives (API Error).";
  }
};

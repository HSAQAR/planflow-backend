export default async function handler(req, res) {
  // Allow requests from any origin (your app)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Handle preflight
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: "No prompt provided" });

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        max_tokens: 1500,
        temperature: 0.7,
        messages: [
          {
            role: "system",
            content: `You are a personal planning assistant. The user will describe a goal or plan.
You MUST respond with ONLY a valid JSON object. No explanation, no markdown, no code blocks, no backticks.
The JSON must follow this exact structure:
{"planTitle":"string","summary":"string","tasks":[{"title":"string","category":"work|health|personal|study|other","priority":"high|medium|low","dayOffset":0,"startH":9,"endH":10,"notes":"string","subtasks":["string"]}]}
Rules:
- dayOffset is days from today (0=today, 1=tomorrow, etc)
- startH and endH are integers 0-23 representing hours
- Generate between 5 and 8 tasks
- subtasks can be an empty array []
- Output ONLY the raw JSON object, nothing else, no markdown`,
          },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return res.status(500).json({ error: `Groq error: ${err}` });
    }

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content || "";
    const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
    const plan = JSON.parse(cleaned);

    return res.status(200).json(plan);
  } catch (err) {
    return res.status(500).json({ error: err.message || "Something went wrong" });
  }
}

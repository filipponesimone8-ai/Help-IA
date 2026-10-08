export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { context, userText, history } = req.body || {};
    if (!userText) {
      return res.status(400).json({ error: "userText mancante" });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        error: "OPENAI_API_KEY non configurata su Vercel"
      });
    }

    const systemPrompt =
      "Sei HelpIA, un assistente italiano competente e chiaro. " +
      "Rispondi in italiano, in modo semplice ma completo. " +
      "Contesto dell'utente: " + (context || "generico") + ".";

    const messages = [
      { role: "system", content: systemPrompt },
      ...(Array.isArray(history) ? history : []),
      { role: "user", content: userText }
    ];

    const response = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + apiKey
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: messages,
          temperature: 0.7
        })
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({
        error: "Errore OpenAI: " + errText.slice(0, 300)
      });
    }

    const data = await response.json();
    const reply =
      data.choices?.[0]?.message?.content ||
      "Nessuna risposta ricevuta.";

    const youtubeSearch =
      "https://www.youtube.com/results?search_query=" +
      encodeURIComponent(userText + " " + (context || ""));

    return res.status(200).json({
      reply: reply,
      youtubeSearch: youtubeSearch
    });

  } catch (err) {
    return res.status(500).json({
      error: "Errore server: " + err.message
    });
  }
}

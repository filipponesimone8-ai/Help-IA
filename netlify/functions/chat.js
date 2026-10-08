// netlify/functions/chat.js
exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { context, userText } = JSON.parse(event.body);
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return { statusCode: 500, body: JSON.stringify({ error: "Chiave API mancante." }) };
    }
    if (!userText) {
      return { statusCode: 400, body: JSON.stringify({ error: "Testo mancante" }) };
    }

    const safeContext = context ? String(context) : "Generale";
    const systemPrompt = `Sei un assistente esperto. L'utente sta chiedendo aiuto nella categoria: "${safeContext}". Rispondi in italiano, in modo chiaro, pratico e utile. Se è un problema di salute, ricorda sempre di consultare un medico. Sii conciso ma completo.`;

    // Lista di modelli da provare in ordine (dal più nuovo al più stabile)
    const modelli = ["gemini-3.8-pro", "gemini-3.8-flash", "gemini-2.5-flash"];
    let ultimoErrore = "Nessun modello disponibile";

    for (const modello of modelli) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modello}:generateContent?key=${apiKey}`;
      
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: systemPrompt + "\n\nDomanda utente: " + userText }] }]
        })
      });

      const data = await response.json();

      // Se il modello funziona, restituisco la risposta
      if (response.ok) {
        const botReply = data.candidates?.[0]?.content?.parts?.[0]?.text || "Nessuna risposta.";
        return {
          statusCode: 200,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reply: botReply })
        };
      }

      // Altrimenti salvo l'errore e provo il prossimo modello
      ultimoErrore = data.error?.message || "Errore sconosciuto";
    }

    // Se nessun modello ha funzionato, restituisco l'ultimo errore
    return {
      statusCode: 503,
      body: JSON.stringify({ error: "Tutti i modelli sono occupati. Riprova tra poco. Dettagli: " + ultimoErrore })
    };

  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Errore interno: " + error.message })
    };
  }
};

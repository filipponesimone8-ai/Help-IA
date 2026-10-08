// netlify/functions/chat.js
exports.handler = async (event) => {
  // 1. Accetta solo POST
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: "Method Not Allowed"
    };
  }

  try {
    // 2. Leggi i dati inviati dal sito
    const { context, userText } = JSON.parse(event.body);

    // 3. Leggi la chiave API OpenRouter da Netlify
    const apiKey = process.env.OPENROUTER_API_KEY;

    // 4. Controlli di sicurezza
    if (!apiKey) {
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: "Chiave API OpenRouter mancante. Controlla le variabili su Netlify."
        })
      };
    }

    if (!userText) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: "Testo mancante"
        })
      };
    }

    // 5. Preparo il prompt per l'IA
    const safeContext = context ? String(context) : "Generale";

    const systemPrompt = `Sei un assistente esperto.
L'utente sta chiedendo aiuto nella categoria: "${safeContext}".
Rispondi in italiano, in modo chiaro, pratico e utile.
Se è un problema di salute, ricorda sempre di consultare un medico.
Sii conciso ma completo.`;

    // 6. Chiamo OpenRouter
    const url = "https://openrouter.ai/api/v1/chat/completions";

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "HTTP-Referer": "https://TUO-SITO.netlify.app",
        "X-Title": "Mio Assistente AI"
      },
      body: JSON.stringify({
        model: "openrouter/free",
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: userText
          }
        ],
        temperature: 0.7,
        max_tokens: 1024
      })
    });

    const data = await response.json();

    // 7. Gestione errori OpenRouter
    if (!response.ok) {
      return {
        statusCode: response.status,
        body: JSON.stringify({
          error: data.error?.message || "Errore da OpenRouter"
        })
      };
    }

    // 8. Estraggo la risposta
    const botReply =
      data.choices?.[0]?.message?.content || "Nessuna risposta.";

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        reply: botReply
      })
    };

  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Errore interno: " + error.message
      })
    };
  }
};

// netlify/functions/chat.js
exports.handler = async (event) => {
  // 1. Accetta solo POST
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    // 2. Leggi i dati inviati dal sito
    const { context, userText } = JSON.parse(event.body);

    // 3. Leggi la chiave API da Netlify
    const apiKey = process.env.GEMINI_API_KEY;

    // 4. Controlli di sicurezza
    if (!apiKey) {
      return { 
        statusCode: 500, 
        body: JSON.stringify({ error: "Chiave API mancante. Controlla le variabili su Netlify." }) 
      };
    }
    if (!userText) {
      return { 
        statusCode: 400, 
        body: JSON.stringify({ error: "Testo mancante" }) 
      };
    }

    // 5. Preparo il prompt per l'IA
    const safeContext = context ? String(context) : "Generale";
    const systemPrompt = `Sei un assistente esperto. L'utente sta chiedendo aiuto nella categoria: "${safeContext}". Rispondi in italiano, in modo chiaro, pratico e utile. Se è un problema di salute, ricorda sempre di consultare un medico. Sii conciso ma completo.`;

    // 6. Chiamo Google Gemini
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
    
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: systemPrompt + "\n\nDomanda utente: " + userText }]
        }]
      })
    });

    const data = await response.json();

    // 7. Se Google risponde con errore, lo mostro
    if (!response.ok) {
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: data.error?.message || "Errore da Google" })
      };
    }

    // 8. Estraggo la risposta e la restituisco al sito
    const botReply = data.candidates?.[0]?.content?.parts?.[0]?.text || "Nessuna risposta.";
    
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reply: botReply })
    };

  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Errore interno: " + error.message })
    };
  }
};

// netlify/functions/chat.js

exports.handler = async (event) => {

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: "Method Not Allowed"
    };
  }

  try {

    const {
      context,
      userText,
      history
    } = JSON.parse(
      event.body || "{}"
    );


    /*
     * Chiave OpenRouter.
     *
     * IMPORTANTE:
     * La chiave rimane su Netlify.
     * NON inserirla qui direttamente.
     */

    const apiKey =
      process.env.OPENROUTER_API_KEY;


    if (!apiKey) {

      return {
        statusCode: 500,

        body: JSON.stringify({
          error:
            "Chiave API OpenRouter mancante. Controlla le variabili su Netlify."
        })
      };
    }


    if (
      !userText ||
      !String(userText).trim()
    ) {

      return {
        statusCode: 400,

        body: JSON.stringify({
          error:
            "Testo mancante"
        })
      };
    }


    const safeContext =
      context
        ? String(context).slice(0, 200)
        : "Generale";


    /*
     * Prompt dell'assistente
     */

    const systemPrompt = `

Sei HelpIA, un assistente virtuale italiano.

La categoria dell'utente è:

"${safeContext}"

Rispondi sempre in italiano.

Sii chiaro, pratico, naturale e gentile.

Fornisci risposte utili e abbastanza concise.

Tieni conto della conversazione precedente.

Non inventare informazioni.

Se non sei sicuro di qualcosa,
dillo chiaramente.

Se l'utente chiede un TESTO,
fornisci direttamente il testo richiesto.

Se l'utente chiede un VIDEO,
indica che può utilizzare il pulsante YouTube
presente nella risposta.

Se l'utente chiede TESTO + VIDEO,
fornisci prima una spiegazione/testo utile
e poi consenti la ricerca del video su YouTube.

Per problemi di salute,
fornisci informazioni generali e non fare diagnosi.
In caso di sintomi gravi o urgenti,
invita l'utente a rivolgersi tempestivamente
a un professionista sanitario o ai servizi di emergenza.

Per problemi tecnici,
spiega passo per passo.

Per musica,
cucina, tecnologia, motori, animali,
lavoro e altre categorie,
adatta la risposta all'argomento.

`;


    /*
     * Costruzione messaggi
     */

    const messages = [

      {
        role: "system",
        content: systemPrompt
      }

    ];


    /*
     * Memoria conversazione
     */

    if (
      Array.isArray(history)
    ) {

      const safeHistory =
        history
          .filter(item =>
            item &&
            (
              item.role === "user" ||
              item.role === "assistant"
            ) &&
            typeof item.content === "string"
          )
          .slice(-12);


      for (
        const item of safeHistory
      ) {

        messages.push({

          role:
            item.role,

          content:
            item.content
              .slice(0, 4000)

        });
      }
    }


    /*
     * Nuova domanda
     */

    messages.push({

      role: "user",

      content:
        String(userText)
          .slice(0, 4000)

    });


    /*
     * OpenRouter
     */

    const response =
      await fetch(
        "https://openrouter.ai/api/v1/chat/completions",
        {

          method: "POST",

          headers: {

            "Content-Type":
              "application/json",

            "Authorization":
              `Bearer ${apiKey}`,

            "X-Title":
              "HelpIA"

          },

          body: JSON.stringify({

            model:
              "openrouter/free",

            messages:
              messages,

            temperature:
              0.7,

            max_tokens:
              1024

          })
        }
      );


    const data =
      await response.json();


    if (!response.ok) {

      return {

        statusCode:
          response.status,

        body:
          JSON.stringify({

            error:
              data.error?.message ||
              "Errore da OpenRouter"

          })
      };
    }


    /*
     * Risposta AI
     */

    const botReply =
      data.choices?.[0]
        ?.message?.content ||
      "Nessuna risposta.";


    /*
     * Link YouTube.
     *
     * Per ora non utilizziamo
     * la YouTube Data API.
     *
     * Creiamo una ricerca diretta
     * su YouTube usando la domanda
     * dell'utente.
     */

    const youtubeUrl =
      "https://www.youtube.com/results?search_query=" +
      encodeURIComponent(
        `${safeContext} ${userText}`
      );


    /*
     * Risposta alla pagina
     */

    return {

      statusCode: 200,

      headers: {

        "Content-Type":
          "application/json"

      },

      body:
        JSON.stringify({

          reply:
            botReply,

          youtubeSearch:
            youtubeUrl

        })
    };


  } catch (error) {

    return {

      statusCode: 500,

      body:
        JSON.stringify({

          error:
            "Errore interno: " +
            error.message

        })
    };
  }
};
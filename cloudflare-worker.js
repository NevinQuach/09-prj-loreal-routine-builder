const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

addEventListener("fetch", (event) => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const body = await request.json();
    const messages = body.messages;

    if (!Array.isArray(messages) || messages.length === 0) {
      return jsonResponse({ error: "messages array is required" }, 400);
    }

    const openAIResponse = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages,
        }),
      },
    );

    const data = await openAIResponse.json();

    if (!openAIResponse.ok) {
      return jsonResponse(
        {
          error: data.error?.message || "OpenAI request failed",
        },
        openAIResponse.status,
      );
    }

    const reply =
      data.choices?.[0]?.message?.content || "No response generated.";

    return jsonResponse({
      choices: data.choices,
      reply,
    });
  } catch (error) {
    return jsonResponse({ error: "Invalid request payload" }, 400);
  }
}

function jsonResponse(data, status) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders,
    },
  });
}

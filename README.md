# Project 9: L'Oréal Routine Builder

L’Oréal is expanding what’s possible with AI, and now your chatbot is getting smarter. This week, you’ll upgrade it into a product-aware routine builder.

Users will be able to browse real L’Oréal brand products, select the ones they want, and generate a personalized routine using AI. They can also ask follow-up questions about their routine—just like chatting with a real advisor.

## Cloudflare Worker setup (no API key in browser)

This project sends chat requests from the browser to a Cloudflare Worker.
The Worker calls OpenAI using a server-side secret, so your API key is never exposed in client-side code.

### 1) Deploy the Worker

1. Create a new Cloudflare Worker.
2. Copy the code from `cloudflare-worker.js` into your Worker.
3. Add your OpenAI key as a Worker secret:

```bash
wrangler secret put OPENAI_API_KEY
```

4. Deploy the Worker and copy its URL.

### 2) Connect the frontend

1. Open `script.js`.
2. Set `WORKER_URL` to your deployed Worker URL.

Example:

```js
const WORKER_URL = "https://your-worker-name.your-subdomain.workers.dev/";
```

### 3) Security checklist

- Do not add any API key to `script.js` or `index.html`.
- Keep `secrets.js` out of HTML script tags.
- Store sensitive keys only in Cloudflare Worker secrets.

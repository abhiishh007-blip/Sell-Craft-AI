# SellCraft AI — Local-first product listing studio

SellCraft helps independent sellers draft ecommerce product titles, descriptions, and search tags. The interface is built with **HTML, CSS, and vanilla JavaScript**. Its real AI path calls **Ollama**, which runs an open-weight language model locally on your own computer.

## Why this is a useful side hustle

Small sellers often spend time writing product copy for every listing. SellCraft turns product facts into a first draft they can edit and export. Potential customers include handmade sellers, Instagram/WhatsApp shops, resellers, and tiny ecommerce businesses.

## What works

- Product title, category, platform, features, audience, tone, price, and keywords inputs
- Local AI generation using the Ollama HTTP API and `qwen2.5:3b`
- Editable title, description, and tags
- Copy individual sections or the full listing
- Export the listing as `.txt`
- Stores recent drafts in browser local storage
- Demo fallback if Ollama isn't available (template-based, **not AI-generated**)
- Configurable Ollama endpoint

## Run it locally

1. Install [Ollama](https://ollama.com/download).
2. Download the model:
   ```bash
   ollama pull qwen2.5:3b
   ```
3. Start Ollama. Its API normally listens on `http://localhost:11434`.
4. Serve this folder through a local web server. For example, with Python installed, open a terminal in this folder and run:
   ```bash
   python -m http.server 8000
   ```
5. Open `http://localhost:8000` in your browser.
6. If the browser blocks cross-origin calls, configure Ollama's `OLLAMA_ORIGINS` environment variable to allow your local origin (for example `http://localhost:8000`), then restart Ollama. See Ollama's current documentation for OS-specific environment setup.

The app calls `POST http://localhost:11434/api/generate` with `stream: false` and JSON output mode. It checks `/api/tags` for connection status.

## Privacy notes

The intended AI path sends prompts to the Ollama service running on the same computer, not to a hosted model API. Google Fonts are loaded from the web in the current design; remove the font imports in `index.html` if you want a fully offline UI. Draft history stays in that browser's local storage. Avoid entering sensitive client information unless you understand the security of your own device.

## Open innovation angle

Open-weight models make it possible to run generation on a seller's existing laptop, avoid per-request hosted API fees, choose a different compatible model, and adapt prompts or the model to a niche. This is not automatically cost-free: local inference still uses hardware and electricity, and users must install and maintain the model. The demo fallback is for previewing the UI only; it should not be described as AI output.

## Before launching as a paid product

- Test with real sellers and collect feedback before claiming it improves sales.
- Add marketplace-specific limits and templates based on current seller requirements.
- Add robust validation, better error messages, tests, and accessible form states.
- If adding payments or cloud sync, explain the data flow clearly and keep local-first mode available.
- Never promise sales or conversion improvements without evidence.

## Files

- `index.html` — app structure
- `style.css` — responsive visual design
- `script.js` — Ollama integration, draft rendering, export, and demo fallback

# Connect the lecture AI backend

The GitHub Pages app is static. Uploading and organising decks works locally; AI generation requires the separate server in this repository. No provider API key is placed in the frontend, GitHub Actions or the repository.

## Deploy on Render

1. Sign in at https://dashboard.render.com/ and choose **New → Blueprint**.
2. Connect `aleks1212121/revise-1`, branch `main`. Render reads `render.yaml` and prepares the `micro-lecture-ai` Node service.
3. Supply `APP_AI_KEY` securely in Render using an OpenAI API key with access to the configured model and API billing. Never enter this key in the flashcard app, commit it, or send it in chat.
4. Create the Blueprint. Render generates `AI_ACCESS_TOKEN` as a private service passcode. Leave `AI_MODEL=gpt-4.1`, or use another model supporting vision and strict JSON-schema chat-completion responses. `ALLOWED_ORIGINS` includes the GitHub Pages origin and local development origins.
5. Once the service deploys, copy its HTTPS URL and read the generated `AI_ACCESS_TOKEN` in Render's environment settings.
6. Open the app → **Lectures** → **Connect your AI service**. Enter the Render URL and service passcode. Choose **Check connection**. The passcode is kept only in the page's memory; reconnect after a reload. The URL is remembered in this browser.
7. Choose a PDF or PPTX, give it a title, select **AI-written cloze cards**, then choose **Generate with AI**. That action sends extracted text and compressed slide pictures through your backend to OpenAI. Your backend does not store the upload. OpenAI usage is billed to the server key's account.

Render's free service may take time to wake up. If connection checking times out, wait for the service to finish starting and retry. Set a spending budget in the provider account; the backend also limits requests to 60 batches per hour and one active request. Keep the service passcode private. GitHub Pages must remain enabled separately.

## What the AI does

The browser reads the lecture and retains full source slides or extracted PPTX pictures locally. It sends batches of up to eight slides, with up to two compressed images per slide. The model writes short, contextual numbered clozes, groups them by topic, supplies explanations, and refers to the original slide number. Administrative/reference slides are skipped. Source instructions are treated as data, not instructions for the model.

Cards are **AI-generated drafts**, not a guarantee of scientific correctness or identical quality to the manually reviewed example lecture. Review them in Card library. Images appear on reveal; PDF images contain the full source page, and embedded PPTX raster pictures are attached to their originating slide. PPTX vector shapes and animations are not extracted; export as PDF to preserve diagrams and charts as rendered pages. Automatic label masking, external image search and bespoke diagram creation are not part of this generator.

Each deck has separate spaced-review progress. New uploads do not replace previous lectures. Switch between decks in Lectures. Existing browser decks are automatically registered in the collection. JSON imports restore one exported deck as another lecture; export each deck individually to move devices.

If an AI call fails, the source lecture and local draft cards remain in your collection. The error is shown, rather than reporting those drafts as AI-written. You can retry by uploading again. Local draft mode is always available and never sends slides to the backend.

## Run the backend locally

Requires Node.js 22.22+ (or the runtime accepted by the pinned PDF library).

Set `APP_AI_KEY` and `AI_ACCESS_TOKEN` securely in your shell or hosting settings, then:

```sh
npm ci
npm run start:ai
```

The API listens on port 8787 by default (`PORT` can override it). The app accepts `http://localhost:8787` for development; production endpoints require HTTPS. Allow your development frontend origin in `ALLOWED_ORIGINS`, comma-separated. The default includes localhost ports 5173 and 4173. Keep any local `.env` files untracked; the server reads process environment variables and does not load `.env` files automatically.

- `GET /health`: reports configuration readiness. With an Authorization header, validates the service passcode. It does not verify provider billing/model access.
- `POST /generate`: requires `Authorization: Bearer <service passcode>`, validates slide batches, calls OpenAI, validates the returned card schema and source numbers, and returns the notes.
- Maximum body: 12 MB; maximum eight slides, two raster images per slide. Provider calls time out after 90 seconds. Lecture contents and credentials are not logged.

Tests use explicit fixture provider responses; a test pass does not establish live provider access. Real generation must be validated after deployment and secure key entry.

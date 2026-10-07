# Micro — Revisiting Microorganisms

A static, local-first flashcard app for the LS5008 / LS5030 lecture. The included deck was written from the uploaded 65-slide lecture PDF and contains **178 focused cloze cards**, including **7 visual-recall cards** using cropped slide pictures. Every card has a source slide; all 65 slide references are included.

## Run and validate

Requires Node.js 20.19+ or 22.12+.

```sh
npm ci
npm run dev
npm test
npm run build
```

The Vite base path is `/revise-1/`. New visitors start with the included lecture deck. Existing visitors keep their current deck in the collection and can switch to **Microorganisms deck** without discarding it. The lecture deck reset requires confirmation.

## Study

Click a card or press Space to reveal the missing term. After reveal, rate Again (1), Hard (2), Good (3), or Easy (4). Each button shows the next review interval. Arrow keys navigate. The default Due now view contains new cards and scheduled refreshers. You can also browse all cards, unstudied cards, cards to revisit, or visual cards, and choose a lecture section; shuffle to vary the order.

The deck tests individual facts, distinctions and structure–function relationships. Visual cards show cropped figures without the answer labels, then reveal the original slide. Text cards show the source slide after reveal. **View source slide** opens the full reference. The research-figure cards distinguish association from causation; the supplied figure alone cannot prove causes of outbreak success.

## Edit clozes

In Card library, create or edit a card. Select a term and choose **Hide selected text**, or enter `{{c1::answer}}` / `{{c1::answer::hint}}`. Use `c2` for a separate deletion card; repeated `c1` deletions are hidden together. Creating a note with multiple numbers creates a card for each number. Editing a cloze note updates all its linked numbered cards while retaining their progress; adding or removing deletion numbers adds or removes the corresponding cards.

Choose Question & answer for conventional cards. Set the source slide to link its pictures. Images appear after reveal by default; enable showing images with the question only if they do not reveal the answer.

## Storage and import

Decks, pictures and progress are stored in browser IndexedDB, allowing larger picture-based decks. Existing localStorage decks are read for migration and left intact as a legacy backup. Export creates a portable JSON deck with the pictures embedded. Importing adds a new lecture to your collection, preserving earlier decks. Export before clearing browser data or changing devices.

PowerPoint imports extract slide text, bold emphasis, and embedded PNG/JPEG/GIF/WebP images locally. Supported factual sentences become draft clozes; other text and image-only slides remain in the reference viewer. These automatic drafts are distinct from the included lecture-based deck. Speaker notes, vector-only images, animations and OCR are not supported. PDF uploads are rendered locally into source-page images and their text is extracted. The bundled example deck was written from the original PDF during development.

No backend or API keys are needed for study, local drafts or deck organisation. Optional AI generation uses the separate secure backend described below. Card data is rendered as escaped text. Only embedded raster-image data and the included lecture image paths can be displayed.

## GitHub Pages

`.github/workflows/deploy-pages.yml` installs locked dependencies, runs tests, builds the app, uploads `dist/`, and deploys it on pushes to `main`. It can also be run manually.

In **Settings → Pages → Build and deployment**, choose **GitHub Actions** as the source and ensure Actions is enabled. After successful deployment:

https://aleks1212121.github.io/revise-1/

For another static host, adjust the Vite `base` path, run `npm run build` and publish `dist/`. No Node server is needed in production. Generated build output and `node_modules/` are ignored. Public lecture images and deck content are in `public/lecture/` and copied into the build.

## Editorial notes

The supplied slides contain some simplifications and a likely “nucleotide” typo on the nucleoid slide. Cards use nucleoid, avoid the ambiguous slime-layer removability statement, and test mycolic-acid properties without repeating an oversimplified Gram-classification claim. The unmodified slides remain available for reference. Full original-slide images retain their source attributions.


## Timed refreshers

Cards are never marked done forever. This app uses a simple progressive schedule inspired by spaced repetition, rather than Anki's FSRS algorithm:

- **Again:** relearn in 10 minutes, resetting the interval progression.
- **Hard:** at least 1 day; later intervals grow slowly (about 1.2×).
- **Good:** 1 → 3 → 7 → 14 → 30 → 60 → 120 → 180 → 365 days. Reviews continue yearly at the cap.
- **Easy:** skips one step in that progression (3 days on a new card).

Due times, last ratings, review counts and lapses are saved in IndexedDB and included in JSON backups. Older confident cards without a timer are made due on upgrade; existing schedules and edits are retained. Editing linked cloze cards preserves each card's own schedule, and newly added deletion numbers start unscheduled.

The due queue checks every 30 seconds while the app is open and when its tab becomes visible. If the app is closed, open it again to see the cards due. It does not send background or phone notifications. Progress is local to your browser; export/import to move it between devices. All cards remains available for optional practice before a scheduled review.

## Additional study visuals

Ten original labeled study schematics illustrate bacterial cells, Gram-positive/negative envelopes, peptidoglycan, phospholipid membranes, DNA/plasmids, ribosomes, biofilms, growth phases, motility and mycolic-acid-rich envelopes. They are simplified diagrams, not micrographs or chemically exact molecular structures, and are labeled as not to scale. They are bundled locally in `public/illustrations/`, so they don't depend on third-party image hosting.

Relevant cards offer **Show visual hint** before reveal, and show their illustrations after reveal. Hints contain labels and may help reveal the answer; leave them closed when testing unaided recall. Original lecture microscopy and source slides remain available. Saved lecture decks receive these additional illustrations automatically without resetting their progress. JSON exports embed both slide images and study diagrams.

The optional illustration source is `scripts/generate-study-illustrations.py` (requires Python, Pillow and the DejaVu Sans font). It is not needed to run or deploy the app; the generated PNG assets are committed.


## Upload and organise more lectures

Choose **Lectures** in the workspace sidebar to upload PDF/PPTX files, name lectures, switch decks and keep separate review schedules. JSON deck imports also add separate lectures. Decks, source pictures and progress remain in browser IndexedDB. The original Microorganisms deck stays in the collection.

**AI-written cloze cards** reads text and pictures using the separate backend and groups cards by topic, with short explanations and source references. **Local draft cards** is a clearly labeled offline alternative; it is not AI. AI generation is unavailable until the backend is deployed and connected. The Render Blueprint is ready in `render.yaml`; complete [AI setup](docs/AI-SETUP.md) to activate it.

All slide-reading, deck collection and study code still deploys as a static GitHub Pages app. The API key stays only in the Render environment. Backend tests and browser checks use fixture responses; real provider generation is unverified until credentials and hosting are supplied.

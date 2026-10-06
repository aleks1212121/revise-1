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

The Vite base path is `/revise-1/`. New visitors start with the included lecture deck. Existing visitors keep their current deck and can choose **Load improved lecture deck**; export first to preserve a custom deck. The lecture deck reset requires confirmation.

## Study

Click a card or press Space to reveal the missing term. After reveal, press 1 for Still learning or 2 for Got it. Arrow keys navigate. Filter unstudied cards, cards to revisit, or visual cards, and choose a lecture section; shuffle to vary the order.

The deck tests individual facts, distinctions and structure–function relationships. Visual cards show cropped figures without the answer labels, then reveal the original slide. Text cards show the source slide after reveal. **View source slide** opens the full reference. The research-figure cards distinguish association from causation; the supplied figure alone cannot prove causes of outbreak success.

## Edit clozes

In Card library, create or edit a card. Select a term and choose **Hide selected text**, or enter `{{c1::answer}}` / `{{c1::answer::hint}}`. Use `c2` for a separate deletion card; repeated `c1` deletions are hidden together. Creating a note with multiple numbers creates a card for each number. Editing a cloze note updates all its linked numbered cards while retaining their progress; adding or removing deletion numbers adds or removes the corresponding cards.

Choose Question & answer for conventional cards. Set the source slide to link its pictures. Images appear after reveal by default; enable showing images with the question only if they do not reveal the answer.

## Storage and import

Decks, pictures and progress are stored in browser IndexedDB, allowing larger picture-based decks. Existing localStorage decks are read for migration and left intact as a legacy backup. Export creates a portable JSON deck with the pictures embedded. Importing replaces the current deck after confirmation. Export before clearing browser data or changing devices.

PowerPoint imports extract slide text, bold emphasis, and embedded PNG/JPEG/GIF/WebP images locally. Supported factual sentences become draft clozes; other text and image-only slides remain in the reference viewer. These automatic drafts are distinct from the included lecture-based deck. Speaker notes, vector-only images, animations and OCR are not supported. The app does not accept PDF imports; the provided PDF was read during development to create the included deck.

No backend or API keys are needed. Card data is rendered as escaped text. Only embedded raster-image data and the included lecture image paths can be displayed.

## GitHub Pages

`.github/workflows/deploy-pages.yml` installs locked dependencies, runs tests, builds the app, uploads `dist/`, and deploys it on pushes to `main`. It can also be run manually.

In **Settings → Pages → Build and deployment**, choose **GitHub Actions** as the source and ensure Actions is enabled. After successful deployment:

https://aleks1212121.github.io/revise-1/

For another static host, adjust the Vite `base` path, run `npm run build` and publish `dist/`. No Node server is needed in production. Generated build output and `node_modules/` are ignored. Public lecture images and deck content are in `public/lecture/` and copied into the build.

## Editorial notes

The supplied slides contain some simplifications and a likely “nucleotide” typo on the nucleoid slide. Cards use nucleoid, avoid the ambiguous slime-layer removability statement, and test mycolic-acid properties without repeating an oversimplified Gram-classification claim. The unmodified slides remain available for reference. Full original-slide images retain their source attributions.

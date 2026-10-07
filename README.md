# Micro — Lecture flashcards

A static, local-first flashcard app for the LS5008 / LS5030 lecture. The included deck was written from the uploaded 65-slide lecture PDF and contains **178 focused cloze cards**, including **7 visual-recall cards** using cropped slide pictures. Every card has a source slide; all 65 slide references are included.

The collection also includes **Lecture 2 — Genetic variation**: **161 reviewed cloze cards**, including **10 visual cards** drawn from eight diagram crops, with all **47 source slides**. It is automatically added to the sidebar and Lectures collection, without replacing your active deck, edits or review schedules. Switching lectures keeps progress separate. All bundled decks are free to study and require no AI service, account or API key.

The genetics deck covers genotype/phenotype, the genetic code, mutation classes, coding and non-coding effects, sickle-cell disease, cystic fibrosis, Huntington’s disease, splicing and inheritance mechanisms. It includes practical classification and mechanism questions. Source slide 35 incorrectly says glutamine → valine for sickle-cell disease; the cards use **glutamate → valine** and explain the correction. The outdated essential-amino-acid count on slide 15 is not tested. Original source slides remain available.

The collection now includes **Cellular injury I & II (LS5009)**, written from Dr Ashrafi’s 80-page lecture PDF: **196 cloze cards**, with **23 visual questions** and **128 text cards linked to targeted illustrations**. There are 26 supporting diagram/photo crops plus 23 visual-prompt crops from the lecture, covering cell membranes, ischaemia, cirrhosis, vitamin D deficiency, sickled cells, cell renewal, hypertrophy, hyperplasia, atrophy, metaplasia, dysplasia and papillomavirus research. The deck appears automatically as **Cell injury I & II** in the sidebar.

Illustrations are available through **Show visual hint** before answering and appear alongside the answer after reveal. Visual questions show crops with answer headings excluded; the full source slide appears on reveal. Credits link each crop back to its lecture slide. The extension section clearly marks papillomavirus research. Cards distinguish CIN III from simple metaplasia and distinguish invasive cancer by basement-membrane invasion; source simplifications are explained rather than taught as absolute rules.

The collection includes **Cell death — Lecture 3 (LS5009)** from Dr Ashrafi’s 30-slide lecture: **115 cloze cards**, including **15 visual questions** and **100 text cards with targeted illustrations** from 13 lecture figure crops. Topics include necrotic morphology, coagulative/liquefactive/caseous/fat necrosis, gangrene, apoptotic roles and morphology, p53 and disease, and necrosis–apoptosis comparisons. It appears automatically as **Cell death** in the sidebar, without resetting other lectures or saved progress. All 30 original slides are included.

The cell-death cards correct the comparison table’s simplifications: apoptosis can be physiological or pathological, necrosis can include nuclear fragmentation, and dry gangrene does not require infection. Source notes explain these distinctions.

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

Decks, pictures and progress are stored in browser IndexedDB, allowing larger picture-based decks. Existing localStorage decks are read for migration and left intact as a legacy backup. Export creates a portable JSON deck with the pictures embedded. Importing adds a new lecture to your collection, preserving earlier decks. Export before clearing browser data. Guest progress is separate on each device; optional accounts can sync it after the free cloud service is configured (see below).

PowerPoint imports extract slide text, bold emphasis, and embedded PNG/JPEG/GIF/WebP images locally. Supported factual sentences become draft clozes; other text and image-only slides remain in the reference viewer. These automatic drafts are distinct from the included lecture-based deck. Speaker notes, vector-only images, animations and OCR are not supported. PDF uploads are rendered locally into source-page images and their text is extracted. The bundled example deck was written from the original PDF during development.

No backend or API keys are needed for study, local drafts or deck organisation. Optional AI generation uses the separate secure backend described below. Card data is rendered as escaped text. Only embedded raster-image data and the included lecture image paths can be displayed.

## GitHub Pages

`.github/workflows/deploy-pages.yml` installs locked dependencies, runs tests, builds the app, uploads `dist/`, and deploys it on pushes to `main`. It can also be run manually.

In **Settings → Pages → Build and deployment**, choose **GitHub Actions** as the source and ensure Actions is enabled. After successful deployment:

https://aleks1212121.github.io/revise-1/

For another static host, adjust the Vite `base` path, run `npm run build` and publish `dist/`. No Node server is needed in production. Generated build output and `node_modules/` are ignored. Vite copies the public lecture images and deck content from `public/lecture/`, `public/genetic-variation/`, `public/cell-injury/` and `public/cell-death/` into the build.

## Editorial notes

The supplied slides contain some simplifications and a likely “nucleotide” typo on the nucleoid slide. Cards use nucleoid, avoid the ambiguous slime-layer removability statement, and test mycolic-acid properties without repeating an oversimplified Gram-classification claim. The unmodified slides remain available for reference. Full original-slide images retain their source attributions.


## Timed refreshers

Cards are never marked done forever. This app uses a simple progressive schedule inspired by spaced repetition, rather than Anki's FSRS algorithm:

- **Again:** relearn in 10 minutes, resetting the interval progression.
- **Hard:** at least 1 day; later intervals grow slowly (about 1.2×).
- **Good:** 1 → 3 → 7 → 14 → 30 → 60 → 120 → 180 → 365 days. Reviews continue yearly at the cap.
- **Easy:** skips one step in that progression (3 days on a new card).

Due times, last ratings, review counts and lapses are saved in IndexedDB and included in JSON backups. Older confident cards without a timer are made due on upgrade; existing schedules and edits are retained. Editing linked cloze cards preserves each card's own schedule, and newly added deletion numbers start unscheduled.

The due queue checks every 30 seconds while the app is open and when its tab becomes visible. If the app is closed, open it again to see the cards due. It does not send background or phone notifications. Guest progress is local to your browser; export/import can move it between devices. After account activation, signing in on each device syncs your private collection and review dates. All cards remains available for optional practice before a scheduled review.

## Additional study visuals

Ten original labeled study schematics illustrate bacterial cells, Gram-positive/negative envelopes, peptidoglycan, phospholipid membranes, DNA/plasmids, ribosomes, biofilms, growth phases, motility and mycolic-acid-rich envelopes. They are simplified diagrams, not micrographs or chemically exact molecular structures, and are labeled as not to scale. They are bundled locally in `public/illustrations/`, so they don't depend on third-party image hosting.

Relevant cards offer **Show visual hint** before reveal, and show their illustrations after reveal. Hints contain labels and may help reveal the answer; leave them closed when testing unaided recall. Original lecture microscopy and source slides remain available. Saved lecture decks receive these additional illustrations automatically without resetting their progress. JSON exports embed both slide images and study diagrams.

The optional illustration source is `scripts/generate-study-illustrations.py` (requires Python, Pillow and the DejaVu Sans font). It is not needed to run or deploy the app; the generated PNG assets are committed.


## Upload and organise more lectures

Choose **Lectures** in the workspace sidebar to upload PDF/PPTX files, name lectures, switch decks and keep separate review schedules. JSON deck imports also add separate lectures. Decks, source pictures and progress remain in browser IndexedDB. The original Microorganisms deck stays in the collection.

**AI-written cloze cards** reads text and pictures using the separate backend and groups cards by topic, with short explanations and source references. **Local draft cards** is a clearly labeled offline alternative; it is not AI. AI generation is unavailable until the backend is deployed and connected. The Render Blueprint is ready in `render.yaml`; complete [AI setup](docs/AI-SETUP.md) to activate it.

All slide-reading, deck collection and study code still deploys as a static GitHub Pages app. The API key stays only in the Render environment. Backend tests and browser checks use fixture responses; real provider generation is unverified until credentials and hosting are supplied.

## Free accounts and device sync

The **Sign in** area supports email/password accounts, confirmation emails, password resets, and private lecture/progress syncing through Supabase. The public app configuration points to the owner’s Supabase project; account activation also requires the database setup and authentication return URLs in that project. Follow [the account setup guide](supabase/SETUP.md), run [the database setup](supabase/setup.sql), and configure the public Project URL and publishable key. GitHub Pages remains a static site. No paid AI service is involved in accounts.

Guest and account collections are stored separately. **Import this browser’s guest progress** copies existing reviews into the signed-in account while preserving the guest copy. Wait for **Synced** before switching devices. Reviews of different cards merge; the latest timestamp wins for simultaneous reviews of the same card. Locally saved changes retry after reconnecting while the app is open. Free-tier storage, bandwidth and inactivity limits still apply.

`npm test` checks card/schedule behavior, sync conflicts, and account row isolation against a local PostgreSQL-compatible database. The browser account checks use fixture authentication responses; live sign-in and email delivery remain unverified until a Supabase project is activated.

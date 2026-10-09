# CHUDS.org — Lecture flashcards

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

Click a card or press Space to reveal the missing term. After reveal, rate Again (1), Hard (2), Good (3), or Easy (4). Again and Hard show the in-session retry gap; Good and Easy show the next scheduled review interval. Arrow keys navigate. The default Due now view contains new cards and scheduled refreshers. You can also browse all cards, unstudied cards, cards to revisit, or visual cards, and choose a lecture section; shuffle to vary the order.

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


## In-session retries and timed refreshers

Choose **Again** to repeat a card after three other cards, or **Hard** to repeat after five. It keeps returning until you choose **Good** or **Easy**. If fewer cards remain, it returns sooner; a single remaining card repeats immediately. Unfinished learning cards remain available after reopening the app, and their learning state syncs with your account. The retry loop also works in All cards and Cram sessions.

Run `npm run test:retry:browser` against the built preview on port 4189 to check delayed repeats, repeated failures, reload persistence and completion on desktop and phone.

Cards are never marked done forever. This app uses a simple progressive schedule inspired by spaced repetition, rather than Anki's FSRS algorithm:

- **Again:** resets the interval progression and saves a 10-minute due time as well as the in-session retry.
- **Hard:** saves a 30-minute due time for new or relearning cards as well as the in-session retry. Later intervals grow slowly (about 1.2×), capped below Good so Hard always returns sooner.
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

## Phone study controls

On phones, a fixed bottom bar shows **Reveal answer**, then switches to the four review ratings after revealing. You can reveal and rate without scrolling down, including in landscape. Next/Previous also stay in the bar, with larger touch targets. Background syncing waits for an active study tap to finish before rebuilding its controls or changing the visible card. The desktop study layout is unchanged.

To check phone interactions, build the app, run `npm run preview -- --port 4189`, then run `npm run test:phone:browser` with Playwright Chromium installed. `CHROMIUM_PATH` can point to an existing Chromium executable. These fixture checks cover Android-style touch input, taps during syncing, all ratings, review persistence after reload and three phone sizes.

## Friends, daily activity and streaks

Open **Friends & streaks** to see daily slides/cards studied, the last seven days and a streak. Signed-in users can choose a display name, share a friend code, accept requests and compare friends’ Today/Last 7 days leaderboards and overall slide/card coverage. Open Friends & streaks from More on desktop or phone. Study controls remain unchanged.

The owner must run the new [friends.sql migration](supabase/friends.sql) in the existing Supabase SQL Editor to activate sharing; see [Friends setup and counting rules](supabase/FRIENDS.md). Until then, study and deck syncing remain available and the Friends screen explains the missing setup. Guest activity is local. Daily counting begins with this update, uses London midnight and merges across devices without double-counting the same card/day. Only accepted friends receive aggregate statistics; decks, answers, pictures and emails stay private.

## Appearance settings

Open **More → Appearance** on desktop or phone. Choose Light, Dark or Match device, then Forest, Ocean, Lavender or Rose. Match device follows the operating system's colour preference automatically. Choices persist in this browser across reloads and sign-ins; each device can use its own appearance. Original lecture images retain their colours.

After building and starting the preview on port 4189, `npm run test:appearance:browser` checks all eight colour combinations for readable text contrast, persistence, system changes, account inputs and phone grading.

## Welcome screen

New tab sessions open with a playful CHUDS.org welcome and floating dog photos. **Let’s revise** or Escape dismisses it; refreshing in the same tab keeps it dismissed. The animation respects the device's reduced-motion preference. The dialog holds keyboard focus until dismissed, while decks and accounts continue loading underneath. Run `npm run test:welcome:browser` against the preview to check desktop, phone, landscape, reduced motion and dismissal.


## Simple navigation

The main navigation contains **Study**, **Lectures**, **Modules** and **Statistics**. A single current-lecture dropdown switches decks, and one study filter replaces the separate Due/All/Review/New/Visual tabs. **More** contains Friends & streaks, Appearance, My account/Sign in, Card library and Slide reference, plus the existing reset/open-example action. The menu closes when you choose a page, click outside it or press Escape. Review schedules, synced progress, uploads and the phone rating dock stay available.

`npm run test:navigation:browser` checks the compact layout, menu access and lecture switching on desktop, small phones and landscape.

## Lecture collection progress

**Lectures** shows the collection first, with a study-coverage bar, cards reviewed at least once, confident cards and cards due for each deck. Coverage remains recorded after an Again review; due dates and confidence still reflect the review schedule. The upload form is below the collection, and optional AI connection settings are collapsed underneath. `npm run test:lectures:browser` checks progress, reload persistence, the stacked layout and uploads on desktop and phone.

## Voice practice

Expand **Voice practice** under a study card. **Dictate answer** transcribes your response into an editable text box; **Read question/answer aloud** speaks the currently visible card. Blanks remain hidden until reveal. Optionally enable **Read answers aloud when I reveal them** for spoken replies. Compare your response and select Again/Hard/Good/Easy yourself; this is browser speech, without an AI tutor or automatic grading.

Android Chrome supports browser dictation, subject to microphone permission, network availability and the device's speech service. Other browsers may offer read-aloud only, or neither; typing and ordinary flashcard controls remain available. Browser speech recognition may send audio to its provider. This app does not record/upload audio or persist dictated text in decks or account sync. Dictation clears on card/page/account changes. Read-aloud prefers an English voice installed locally, with a browser-selected voice as fallback. Closing Voice practice, leaving the page, hiding the tab or changing the card stops speech/microphone capture.

`npm run test:voice:browser` uses speech fixtures to check reading, hidden answers, opt-in spoken replies, transcription, permission-denied and unsupported-browser fallbacks, and phone grading. Real microphone recognition and speaker output depend on the user's browser and device and are not verified by these fixture checks.

## Modules

Open **Modules** in the main navigation to browse Pathobiology (LS5009), Infection and Immunity (LS5008), Medical Genetics (LS5023), and Medical Physiology, Research Methods and Skills (LS5034). Each module shows its lecture count and aggregate study coverage; choosing it filters the collection and preselects the module for uploads. **Lectures** still shows the full collection.

Existing cell injury/death decks default to Pathobiology, microorganisms to Infection and Immunity, and genetic variation to Medical Genetics. Other existing uploads appear as Unassigned. Use each lecture's Module selector to move it; explicit assignments override defaults and sync with the deck using the existing accounts setup. Moving lectures preserves cards, reviews and source pictures. No new Supabase SQL is needed. `npm run test:modules:browser` checks grouping, moving, reload persistence, empty modules and uploads on desktop and phone.

## Viruses lecture deck

**Modules → Infection and Immunity → Revisiting Microbes — Viruses** contains 200 reviewed cloze cards, including 14 visual questions with crops from the uploaded lecture. All 43 original slides and 13 supporting figure panels are bundled. Existing saved reviews remain intact; no paid AI connection is required. See [deck notes](public/viruses/README.md) for coverage and clarifications of misleading source statements.

## Lecture image zoom

Study pictures fit the available space with their original proportions and no internal scrollbars. Click or tap a study image to open a large viewer, then use +/− to zoom the actual content up to 400%. Scroll to inspect labels; Close or Escape returns to the same card without revealing/grading it. Images also open with Enter/Space when focused. The viewer follows the selected theme; original image colours stay intact. `npm run test:images:browser` checks scaling, zoom, dismissal and phone grading.

## Compact study layout

The study screen reduces headers and spacing and fits images proportionally without internal image scrollbars. Phone study hides the extra header/stats so the card and fixed rating dock have more room. Longer answer explanations are available through **Explanation**; **Voice practice** is a small button beside the source controls with a floating panel. Escape closes these panels. Read-aloud includes the explanation when it is open. The full-size image viewer and zoom remain available.

`npm run test:study-fit:browser` checks 22 representative revealed virus cards (all visual cards and the longest statements) at 1280×720, 1024×600, 360×640 and 390×844, checking page fit, image scrollbars and phone dock clearance. Voice and image browser checks cover the floating voice controls and zoom.

## Importance, difficulty and cram sessions

Open **Focus** beside the study filters. Each deck saves its own Importance (all, important, supporting), Difficulty and Cram mode. The controls combine with the current topic/status/visual selection. Easy sessions contain up to 10 matching cards, Medium up to 25, and Hard up to 50; Any difficulty includes every match during normal study. Cram switches to All cards, restricts to important cards, prioritises harder cards and includes cards ahead of their due date. Any-difficulty cram sessions contain up to 25 cards. Grades still use the existing review schedule; settings never delete cards or reset progress.

Automatic difficulty uses review ratings: Again/Hard → Hard; Easy or confident intervals of at least seven days → Easy; other cards, including unstudied cards → Medium. Importance defaults to a suggested core/supporting classification based on the card's content, with historical details treated as supporting. This is a study suggestion, not an exam prediction. **This card** in Focus lets you override importance/difficulty or restore automatic classification. Reset deck filters restores the full due queue while retaining personal card labels. Preferences and labels sync through existing account deck metadata/content, with independent review clocks; no Supabase migration is required.

`npm test` checks combined filtering, limits, classification, non-destructive selection and independent sync of preferences/labels/reviews. `npm run test:focus:browser` checks combined filters, session limits, future-due cram, hard-first ordering, personal labels, grading, reload persistence, separate deck settings and phone layout.

## Statistics and anonymous shared difficulty

**Statistics** is in the main navigation. Your dashboard groups results by subjects, modules, slides or individual cards, filters by lecture, and highlights strongest/weakest groups after at least five recorded attempts. Good/Easy count as correct, Again as incorrect, and Hard as partial recall. These are self-assessed results. Historical cards retain study coverage, but exact attempt percentages start with this update; earlier outcomes are not invented.

Every new grade records a uniquely identified event in that account's existing deck. Guest data stays in the browser; signed-in attempts sync with the deck. Event union preserves simultaneous offline attempts on different devices without duplicating them, independently of deck settings and the most recent card review. The current account's dashboard remains available if shared statistics is unavailable.

To enable **Everyone · anonymous**, run [supabase/statistics.sql](supabase/statistics.sql) in the existing project's Supabase SQL Editor after setup.sql. The public/publishable app key cannot run database migrations, so this step must be performed in the project dashboard. The migration is safe to repeat and includes all 850 current canonical built-in cards. Private uploads and changed card wording are excluded from shared reports; custom lectures still have personal statistics. Re-run an updated catalog when bundled card wording changes.

The authenticated RPC returns only aggregate counts and canonical card labels, never account identifiers, names, emails, raw review events or private deck content. A card qualifies after at least three separate accounts and five matching recorded attempts. Until then it does not appear. Subject/slide totals aggregate qualifying cards only. Shared results reflect signed-in reviews synced from the updated app. Card difficulty uses (incorrect + 0.5 × partial) / attempts: ≤20% Easy, ≥45% Hard, otherwise Medium; fewer than five attempts means Building data. These labels describe observed recall, not exam importance. Existing Focus difficulty remains based on your own ratings/overrides.

`npm test` checks exact counts, event merging, offline concurrency, weighted grouping and the SQL migration's idempotence, thresholds, canonical wording restrictions, RLS and authenticated-only aggregates. `npm run test:statistics:browser` checks personal percentages, subject/slide/card views, refresh/reload, account isolation, shared reports and phone layout with fixtures.

## Quick-learning cheat sheets

**Lectures → Quick summary** opens a lecture cheat sheet beside its Study/Continue button. **Modules → Quick summary**, or **Quick module summary** above a filtered lecture collection, combines the main ideas from lectures currently assigned to that module. The four main navigation tabs stay unchanged. Module overviews describe the lectures actually present, rather than claiming to cover an entire module syllabus; empty modules invite an upload.

Six built-in lectures have concise reviewed summaries: bacterial structures/growth/identification, genetic variation, cellular injury causes, cellular injury responses/adaptation, cell death, and viruses. New uploads get an outline extracted from saved text cards, with cloze answers filled in, duplicate linked notes removed and image-identification prompts excluded. Draft outlines are labelled for checking against the lecture; no paid AI connection is needed.

Summaries are read-only and scoped to the current account or guest collection. Opening/closing a summary leaves the revision position, grades and schedules intact. Start revision opens the selected lecture; module overviews link to full individual cheat sheets. The dialog supports keyboard focus, Escape and phone layouts and follows appearance settings. No Supabase migration is needed. `npm run test:summaries:browser` checks module/lecture summaries, progress preservation, start revision, empty modules, uploaded outlines and mobile dialogs.

## Separate Cellular Injury I and II

Pathobiology now lists **Cellular Injury I** (84 cards, source slides 1–39) and **Cellular Injury II** (112 cards, source slides 40–80). Slide 40 is the original “Cellular Injury II” title. Both lectures retain the original PDF slide numbers and have their own summaries, coverage, Focus settings, module assignment and study queues.

The storage adapter presents these as separate lectures while retaining the original `cell-injury` record for cloud compatibility. `rawLectures` supplies that record to sync; `allLectures`/`getLecture` supply the separate parts to the interface. Saves merge changed cards into the original record without touching the other part. Review IDs, clocks, due dates, study-day activity and attempt events are preserved; per-part preference clocks prevent changes to one part overwriting the other part's preferences on another device. Existing combined data splits automatically on read. No SQL migration or reupload is needed. Shared statistics map original source slides to the correct part.

`npm run test:injury-split:browser` checks existing combined progress, the 84/112 split, independent Focus settings, summaries, phone layout and review sync to a second device. Unit checks cover event/activity partitioning and simultaneous preference/review merges.

## Admin mode, slide requests and guests

**My account** includes an admin-code box. Generate your private, single-use code in Supabase SQL Editor using [admin-code.sql](supabase/admin-code.sql) after installing [admin.sql](supabase/admin.sql). Redeeming the code grants access to that account; **Admin mode** switches the interface on/off and is remembered per account in each browser. **More → Admin area** provides a searchable registered-user list with basic synced study totals, plus a private slide inbox with downloads, status updates and replies. Admin authorization is checked by the database, independently of the browser toggle. See [activation and usage](supabase/ADMIN.md).

**Lectures → Send slides to admin** accepts PDF/PPTX files up to 20 MB with a module and message. Students must sign in to send slides; only the sender and admins can read the file and reply. Sending files does not automatically create cards. **Study as guest** and **Switch to guest** are explicit account-screen options; guest progress stays in this browser, separate from accounts, and guests do not appear in the admin list.

`npm run test:admin:browser` verifies the desktop/phone flow using fixture data. The live feature requires the Supabase SQL activation; the public website never contains the admin code or a server secret.

## Create decks using your ChatGPT account

Enable **Admin mode**, then open **More → Admin area → Make cards with your ChatGPT account**. Name the lecture and choose its module. Optionally choose the original PDF/PPTX (up to 20 MB). In the slide inbox, **Make cards with ChatGPT** fills these settings from the submission and attaches that submitted lecture's pictures during import.

1. Choose **Copy ChatGPT prompt**, open ChatGPT, and attach the lecture there yourself. The prompt asks for focused cloze notes, original page references, explanations and initial importance/difficulty labels in an importable `chuds-deck.json` file. A manual-copy prompt box is available if clipboard permission is unavailable.
2. Choose ChatGPT's JSON file or paste its complete JSON/code block. **Preview cards** validates it and shows sample questions/answers. Editing the title, module or JSON requires a fresh preview.
3. Choose **Import as new lecture**. The app expands linked cloze notes, attaches pictures from the original source pages when supplied, and starts every card unstudied. Existing decks and schedules stay intact. Check generated answers against the lecture; the deck is labelled as a draft.

This uses ChatGPT in its own tab with your normal account allowance. CHUDS.org does not connect to your ChatGPT session, upload slides to ChatGPT automatically or use an API key. Import adds a private deck to the admin's own study account and syncs it normally; it does not publish the deck to all students. Card-library export remains available for sharing the resulting JSON manually. No extra SQL migration is needed beyond the admin setup.

`npm run test:chatgpt:browser` exercises prompt copying, submitted-lecture selection, pasted/file JSON, previews, original PDF pictures, module grouping and saved decks on desktop and phone using fixtures. Unit tests cover import validation, fresh schedules and safe content fields.

## Personal modules and Trash

Signed-in users can create personal modules in **Modules**, with a name and optional code. They appear only in that account and sync across devices. Assign lectures using the Module dropdown, or upload into the selected module. Guests can use the existing modules but cannot create new ones. Signing out resets the visible module list to that browser's separate guest collection.

**Move to Trash** is available beside lectures and modules, with an “Are you sure?” confirmation. **More → Trash** (also linked from Modules and Lectures) restores them. Trashed lectures leave study queues, lecture lists and personal summaries/statistics; cards, pictures and review schedules remain saved. The two cellular-injury parts can be removed/restored independently. Removing a module leaves its lectures available under Unassigned, with their original assignment preserved for restoration unless you reassign them. Trash has no permanent-delete button or automatic expiry. Guests' Trash stays local; account Trash syncs. Historical friend/community review aggregates may still include earlier activity from trashed lectures.

Personal modules and Trash use a private, empty-card workspace-settings record in the existing account storage. The record stays out of lecture lists, module totals and exports. Per-item change clocks merge independently across devices and prevent old copies from undoing deletions or restorations. No Supabase migration is needed. Importing guest progress does not replace account workspace settings.

`npm run test:personal-modules:browser` checks account isolation, assignments, confirmation/cancellation, restoring saved progress, two-device updates, independent cellular-injury parts, and an entirely trashed collection surviving a reload on desktop and phone.

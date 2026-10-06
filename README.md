# Micro — lecture flashcards

A local-first flashcard app for Revisiting microorganisms (LS5008 / LS5030).

## Run

Requires Node.js 20.19+ or 22.12+.

```sh
npm ci
npm run dev
```

Open the address Vite prints. Import the original `.pptx` using **Choose lecture file**. All parsing happens in your browser; files are not sent to a server. The supplied attachment exceeded the workspace transfer limit, so this repository contains no pre-extracted lecture content.

## Study

Click a card or press Space to reveal its answer. After revealing, press 1 to mark it for review or 2 to mark it confident. Arrow keys navigate. Filter unstudied cards or cards to revisit; shuffle to vary the order. Edit generated questions and answers in Card library, add cards, and export a JSON backup. Importing replaces the current deck after confirmation.

Cards are drafts assembled from slide text, preserving the slide number and topic. Text in diagrams, embedded images, and speaker notes is not extracted; slides containing only images may be omitted. Review the generated deck against the lecture. No external AI service or API credentials are used.

Decks and progress are stored in this browser's localStorage. Export before clearing browser data or switching browsers/devices. For sensitive lectures, use your own trusted browser profile.

```sh
npm run build
npm run preview
```

## Static website deployment

Run `npm ci` followed by `npm run build`, then publish the contents of `dist/` to your static host. No server runtime or API key is required. The build uses relative asset URLs, so it works at a domain root or under `/revise-1/` on GitHub Pages. On Netlify or similar build hosts, use `npm run build` as the build command and `dist` as the publish directory.

The repository includes source files and the dependency lockfile. Generated `dist/` output and `node_modules/` are intentionally ignored; the host builds them from the committed source.

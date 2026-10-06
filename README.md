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

Run `npm ci` followed by `npm run build`, then publish the contents of `dist/` to your static host. No server runtime or API key is required. The build uses the `/revise-1/` base path for GitHub Pages. For a different hosting path, adjust `base` in `vite.config.js` before building.

The repository includes source files and the dependency lockfile. Generated `dist/` output and `node_modules/` are intentionally ignored; the host builds them from the committed source.


## GitHub Pages

The workflow in `.github/workflows/deploy-pages.yml` installs locked dependencies, builds the app, uploads `dist/`, and deploys it to GitHub Pages whenever `main` is updated. It can also be run manually from the Actions tab.

In repository **Settings → Pages → Build and deployment**, select **GitHub Actions** as the source. Ensure GitHub Actions is enabled for the repository. After the workflow succeeds, the site is available at:

https://aleks1212121.github.io/revise-1/

Check the **Deploy to GitHub Pages** workflow in the Actions tab for deployment status. Publishing the app does not preload the lecture file; select your PowerPoint in the browser to create a deck.

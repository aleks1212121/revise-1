# Activate free accounts and progress sync

The app code supports email/password accounts and private cross-device syncing. The public app configuration points to the owner’s Supabase project. The database setup and authentication return URLs must also be configured in that project. Guest study remains available.

1. Open https://supabase.com/dashboard and create an account and a **free** project. Choose a region near you and keep the database password private. Free-tier limits and inactivity pausing are managed by Supabase; no paid AI service is needed.
2. In the project’s **SQL Editor**, paste the complete contents of [setup.sql](setup.sql) and run it. It creates the private `study_decks` table, access policies and revision-aware save function. Each authenticated user can read and write only their own rows.
3. In **Authentication → URL Configuration**, set the Site URL to `https://aleks1212121.github.io/revise-1/` and add that exact URL to the Redirect URLs. Keep email confirmation enabled. Email/password sign-in is supported; no OAuth provider configuration is required.
4. Copy the **Project URL** and **publishable key** from the project’s API/connect settings. A legacy `anon` key also works. These two settings are public; **never use the secret/service-role key or the database password in the app**.
5. Configure the app using either approach:
   - Send the Project URL and publishable key to the coding assistant so it can fill `public/account-config.json` and push the configuration; or
   - In this GitHub repository, open **Settings → Secrets and variables → Actions → Variables**. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. Run **Deploy to GitHub Pages** from the Actions tab to rebuild. These are repository variables, not secret server keys.
6. Once Pages deploys, open the app, choose **Sign in**, create your account and follow the confirmation email. Sign in, then select **Import this browser’s guest progress** on the device where you previously studied. This deliberately transfers guest decks/reviews and leaves the guest copy intact.
7. Wait for **Synced** before changing devices. Open the same site on your other device and sign in with the same account. Lecture decks, edits, deletions and review dates should appear there. **Sync now** performs an immediate check. Signing out returns to that device’s separate guest collection.

## What is synced

Each lecture’s full JSON deck is private to the user: cards, source references, edits, imported pictures and review schedules. Bundled images keep their static repository paths, so they are not reuploaded on every review. Imported images remain embedded in that lecture’s JSON; storage/bandwidth usage therefore depends on your uploads.

While the app is open, locally saved changes can wait for reconnection. Sync runs after saves, on reconnect, when returning to the app, once a minute while visible, and on **Sync now**. This is not an offline-installable PWA. The status reports errors rather than pretending that an unsuccessful upload was synced.

Different cards reviewed on different devices are merged. For simultaneous reviews of the *same* card, the latest review timestamp wins. Content edits and review schedules merge independently. Deletions have timestamps so old device copies do not silently resurrect deleted cards. Cloud writes use optimistic revisions and retry after merging if another device updated a deck. This relies on reasonably accurate device clocks.

## Check the live setup

On the app’s account screen, choose **Check connection**. Before signing in it checks the live Email provider; after signing in it verifies the session, deck-table access and the sync function using an invalid input that is rejected before any write. This does not send an email or change a deck.

Create two test accounts yourself. In account A, rate a card, wait for **Synced**, then sign in as A in another browser and confirm the review date. Sign in as B and confirm A’s progress is absent. Test a guest import and sign-out to confirm that guest data stays separate. Test confirmation and password-reset links with the configured return URL.

Local automated tests exercise the merge rules, the SQL function and row-level access in a PostgreSQL-compatible test engine, and the browser sign-in/sync flow using fixture responses. They do not establish that an unconfigured live Supabase project works. Account activation, live email delivery and hosted authentication must be checked after the project settings are supplied.

To rerun fixture browser checks locally, omit the `VITE_SUPABASE_*` build settings. The test browsers override `account-config.json` with fixture settings, including a blank configuration for the guest fallback test. Run `npm run build`, start `npm run preview -- --port 4189`, then run `npx playwright install chromium` and `npm run test:accounts:browser` in another terminal. If Chromium is already installed, set `CHROMIUM_PATH` to its executable instead of downloading a browser. The script intercepts account configuration and all Supabase traffic in isolated test browsers; it never creates real accounts or sends emails.

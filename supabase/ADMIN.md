# Activate admin mode and lecture submissions

The static website uses the existing Supabase project. No AI service or separate paid backend is needed.

1. In Supabase **SQL Editor**, run [admin.sql](admin.sql) after the existing account setup. This creates the private slide bucket, submission inbox, admin membership and protected functions.
2. Run [admin-code.sql](admin-code.sql). Copy the returned `admin_unlock_code` directly into **More → My account → Unlock admin access** in CHUDS.org while signed in. Keep the returned code private. It works once and expires after seven days; admin membership remains until revoked.
3. Use **Admin mode** in your account to switch the admin interface on/off. **More → Admin area** appears when enabled. The switch is remembered for that account in this browser. On another device, sign into the same account and enable the switch; you do not need another code.

If an existing account should receive access directly instead, use the commented SQL at the end of admin.sql with its actual email. To revoke access, delete that user's row from `public.study_admins` in SQL Editor. Run admin-code.sql again only when you need a new activation code. Activation codes are stored only as hashes, and signed-in users cannot read or create them.

## Using the inbox

Students choose **Lectures → Send slides to admin** or the same item under More. Signed-in students can send PDF/PPTX files up to 20 MB, with a lecture title, module and message. There can be ten unfinished submissions per student. The newest 25 submissions and any replies appear on their submission screen.

The admin inbox shows the sender, module and message, lets you download the original slides, and save Received/Reviewing/Completed status with a reply. Downloads can be opened in a PDF viewer or PowerPoint. The inbox is paginated. Submitting a file does not automatically create or publish a deck; adding reviewed cards remains a separate step. Other students cannot read or download someone else's submissions. The bucket is private; there are no public file URLs. Failed submission uploads are removed when possible; an interrupted browser/network request can leave an orphan that can be cleaned up in Supabase Storage.

The admin user list is paginated and searchable by email. It shows registered accounts, joining/sign-in dates, last sync and aggregate counts of stored decks and studied cards. Counts come from synced deck data, so offline activity appears after sync. Original combined cellular-injury storage counts as one stored deck. The user list does not return passwords or card contents. Authorized admins can separately open **View account (read only)** to check stored lectures and progress. Guest sessions are local and do not appear in the list. Existing private-deck access policies remain in place.

## Make decks with ChatGPT

The admin area includes **Make cards with your ChatGPT account**. Choose **Make cards with ChatGPT** beside an inbox submission to select its title, module and original lecture; alternatively enter your own lecture details and choose a local source file. Copy the prompt, open ChatGPT, and attach the lecture yourself. Return with ChatGPT's JSON file or paste its JSON, preview the sample cards, then import. Original source-slide pictures are attached by page number; references to missing pages are rejected. Without a source file, the result contains text cards.

ChatGPT remains in its own tab and uses your normal account allowance. There are no automatic requests to ChatGPT or OpenAI's API. **Import to my account** creates a fresh private deck in the admin’s own study account. It does not mark the submission Completed. Review the answers before sharing. This import workflow requires no additional Supabase migration.

### Deliver a deck to its submitter

Run [delivery.sql](delivery.sql) once in Supabase SQL Editor, after setup.sql and admin.sql. Select **Make cards with ChatGPT** beside the matching inbox submission, choose the reviewed deck JSON, and check its preview. Enter the recipient’s module name/code (reviewed deck files can fill these automatically), then choose **Send deck to submitter** and confirm the displayed recipient. The server obtains the recipient account from the original submission; no email lookup or service key is needed in the browser.

Delivery adds a private deck with unstudied cards and marks the submission Completed with a reply. A matching active personal module is reused; otherwise the module is created in the recipient’s workspace. The recipient signs in and syncs to see it on their devices. Other accounts and guests do not receive the deck. Their existing decks, progress and Deleted folder are preserved. Delivering the same submission again is refused to protect the existing deck and review history.

Reviewed JSON files can include embedded PNG/JPEG/GIF/WebP slide pictures and focused diagram crops; those pictures are retained. Otherwise the selected submission’s original slides are rendered and attached by page number. Deck JSON files may be up to 20 MB. Lecture files and account-specific decks do not need to be published to GitHub Pages.

## Guest study

Choose **More → Sign in / Guest → Study as guest**. When signed in, **My account → Switch to guest** saves pending work, attempts sync and signs out on this device. The guest collection is separate and remains saved in this browser. It does not sync between devices. **Import this browser's guest progress** remains available when signing in again. Guests can study and import local decks; sending slides and receiving replies requires an account.

## Validation

`npm test` exercises SQL permission boundaries, single-use and expired codes, private files, protected admin actions, pagination, robust study counts and supported file validation. After building and running the preview on port 4189, `npm run test:admin:browser` checks desktop/phone submission, download, reply, guest switching and account-specific mode persistence with fixture responses. `npm run test:delivery:browser` checks confirmation/cancellation, migration errors, recipient targeting, embedded diagrams and receiving decks/modules after cross-device sync on desktop and phone. Tests do not activate the real Supabase project: run the SQL above to enable the hosted features.

## Read-only account viewing

Run [admin-view.sql](admin-view.sql) once, then use **View account (read only)** beside a registered user, or **View sender’s account** beside a submission. The inspector lists that account’s synced lectures, modules, card counts, studied percentages and currently known cards. Choose **View cards** to browse and reveal answers and pictures. It shows Deleted-folder status too. It reads the latest synced database snapshot; offline work and unsynced guest study are not visible.

You remain signed in as yourself. Inspection uses a protected read-only RPC and separate UI state. It never loads another account into your study storage, grades a card, or writes reviews, deck revisions, or sync timestamps. Switch Admin mode off or sign out to clear the inspector. Normal students cannot call this RPC, and their existing private-deck RLS policies are unchanged.

## Prepared decks without uploading JSON

Run [prepared-decks.sql](prepared-decks.sql) after delivery.sql to create the private server-side reviewed library. Only the project owner can populate the table; no browser/service secret is required. An admin sees **Send prepared deck** beside an inbox submission when its original filename matches a reviewed deck. Confirm the displayed recipient, then delivery uses the original submission’s account and opens its read-only snapshot. Duplicate delivery keeps the already-delivered deck and refuses to overwrite progress.

For the two reviewed LS5001 decks, create one private owner-run SQL file with:

```
node scripts/prepare-private-ls5001.mjs /path/to/cell-motility-deck.json /path/to/intracellular-trafficking-deck.json /path/to/private-setup.sql
```

This file installs the viewer and private library with the diagrams embedded. It also attempts automatic delivery, but only when the two exact original filenames each match one submission and both came from the same account. Missing/ambiguous matches leave the library installed for explicit inbox delivery. Already-delivered decks are left intact. Run the file in Supabase SQL Editor; do not commit or publicly host it. The repository contains the generator and schema, not the private slides or deck payloads.

After building, `npm run test:admin-view:browser` exercises desktop and phone delivery without JSON upload, confirmation, diagrams, account inspection, own-session preservation and unchanged review records. `npm test` checks server permissions, matching-file enforcement, read-only payload/revision/timestamp invariants and automatic delivery. Set `ADMIN_SETUP_SQL` to the generated private artifact when running `tests/admin-db.test.js` to validate installation and both complete decks in an isolated database.

## Small setup and lecture packs (recommended)

Avoid copying the large SQL artifact containing base64 pictures. Use **Admin area → Add a prepared lecture pack → Activate lecture packs in Supabase → Copy small Supabase setup**, or open [admin-tools.sql](admin-tools.sql) instead: this is a small combined setup for the read-only viewer, prepared library and protected pack upload. It assumes the existing account/admin setup is installed and can safely be rerun.

In **Admin area → Add a prepared lecture pack**, select the downloaded `.chuds` file and confirm its lecture titles/counts. Pictures upload through the app to the private database; they are not pasted into SQL Editor or published to Pages. Use **Send prepared deck** beside each matching inbox submission, confirm the recipient, then inspect their synced account. Loading a pack only updates the private library and never changes student progress. Sending a deck preserves all existing progress and refuses duplicate delivery. Normal students and guests cannot load packs.

The `.chuds` format is a JSON document with `format: "chuds-lecture-pack"` and `decks: [{id, payload}]`; each payload contains a reviewed deck, embedded pictures, original source filename and module metadata. Packs are limited to 20 MB and 25 decks. The browser validates all decks before upload; the database stages the entire pack atomically. Keep lecture packs out of the public repository.

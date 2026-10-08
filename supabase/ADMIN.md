# Activate admin mode and lecture submissions

The static website uses the existing Supabase project. No AI service or separate paid backend is needed.

1. In Supabase **SQL Editor**, run [admin.sql](admin.sql) after the existing account setup. This creates the private slide bucket, submission inbox, admin membership and protected functions.
2. Run [admin-code.sql](admin-code.sql). Copy the returned `admin_unlock_code` directly into **More → My account → Unlock admin access** in CHUDS.org while signed in. Keep the returned code private. It works once and expires after seven days; admin membership remains until revoked.
3. Use **Admin mode** in your account to switch the admin interface on/off. **More → Admin area** appears when enabled. The switch is remembered for that account in this browser. On another device, sign into the same account and enable the switch; you do not need another code.

If an existing account should receive access directly instead, use the commented SQL at the end of admin.sql with its actual email. To revoke access, delete that user's row from `public.study_admins` in SQL Editor. Run admin-code.sql again only when you need a new activation code. Activation codes are stored only as hashes, and signed-in users cannot read or create them.

## Using the inbox

Students choose **Lectures → Send slides to admin** or the same item under More. Signed-in students can send PDF/PPTX files up to 20 MB, with a lecture title, module and message. There can be ten unfinished submissions per student. The newest 25 submissions and any replies appear on their submission screen.

The admin inbox shows the sender, module and message, lets you download the original slides, and save Received/Reviewing/Completed status with a reply. Downloads can be opened in a PDF viewer or PowerPoint. The inbox is paginated. Submitting a file does not automatically create or publish a deck; adding reviewed cards remains a separate step. Other students cannot read or download someone else's submissions. The bucket is private; there are no public file URLs. Failed submission uploads are removed when possible; an interrupted browser/network request can leave an orphan that can be cleaned up in Supabase Storage.

The admin user list is paginated and searchable by email. It shows registered accounts, joining/sign-in dates, last sync and aggregate counts of stored decks and studied cards. Counts come from synced deck data, so offline activity appears after sync. Original combined cellular-injury storage counts as one stored deck. This view does not return passwords, private questions or answers. Guest sessions are local and do not appear in the list. Existing private-deck access policies remain in place.

## Guest study

Choose **More → Sign in / Guest → Study as guest**. When signed in, **My account → Switch to guest** saves pending work, attempts sync and signs out on this device. The guest collection is separate and remains saved in this browser. It does not sync between devices. **Import this browser's guest progress** remains available when signing in again. Guests can study and import local decks; sending slides and receiving replies requires an account.

## Validation

`npm test` exercises SQL permission boundaries, single-use and expired codes, private files, protected admin actions, pagination, robust study counts and supported file validation. After building and running the preview on port 4189, `npm run test:admin:browser` checks desktop/phone submission, download, reply, guest switching and account-specific mode persistence with fixture responses. Tests do not activate the real Supabase project: run the SQL above to enable the hosted features.

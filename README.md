# Trip Friend

Trip Friend is a free, no-account demo for a group trip. It runs on GitHub Pages without a build step or backend.

## Try the sample trip

1. Open the landing page and select **Try the free demo**.
2. In **Split bills**, select who paid and who shares the expense. Try an equal, custom, or item-by-item split.
3. Under **Who owes whom?**, act as Sagar and mark the sample ₹10 payment as paid. Switch to Satvik and confirm or reject the request.
4. In **Live location**, select a sample pin or pause sample sharing. The demo does not use device GPS.
5. In **Messaging**, send a local message, vote in the breakfast poll, or preview a call alert and an uploaded tone.
6. In **Photos**, add a photo to the local album.

Bills, repayments, chat, poll votes and photos persist in browser storage. Calls, notifications, location sharing, and reminders are demonstrations. No account, cloud uploads, cross-device sync, or payment processing are included.

## Deploy with GitHub Pages

Open **Settings → Pages → Deploy from a branch**. Select **main** and **/ (root)**, then save. Use the live URL shown by GitHub after the deployment finishes. The expected default URL is https://kothakula-sagar.github.io/trip-friend/.

The landing page contains search metadata, a canonical URL, and website structured data. The sitemap is at `/trip-friend/sitemap.xml`. Submit that URL in Google Search Console after verifying the site. Update the canonical, Open Graph URL, structured data and sitemap if the site moves to a custom domain.

## Local preview

Run `python -m http.server 8000` from the repository root and open http://localhost:8000/. On HTTPS or localhost, the service worker caches the demo shell for offline access after a successful first load.

## Release and production plan

The first public version is `1.0.0`. Visitors install the current PWA from the website. An existing installation checks for the latest version when opened, when it comes back online, and periodically while visible. Update now activates the latest waiting service worker and reloads the app. Releases are cumulative. An installation can go directly from 1.0.0 to the newest published version. Update the version in release.json, release.js and the service worker cache name together in each release.

### Connected app requirements

- **Release alerts and sign-in.** Store the latest version and minimum supported version in a release manifest or authenticated backend configuration. Check both before sign-in and when a session resumes. Prompt for newer versions and require the update before entering the app when a release raises the minimum supported version. Protect incompatible backend operations with a server-side version check. Allow offline read-only access to the cached shell. Send release push alerts only to installed users who opted in and have a valid subscription. The in-app version check also covers users who miss the push.
- **Roles.** Create the owner's email/password account in Firebase Auth. Assign super-admin privileges server-side to exactly one Firebase UID using the Admin SDK, with an owner UID check. Trip creation gives the creator admin rights for that trip. The owner can also join trips as an ordinary member or create trips as a trip admin. Trip roles are scoped to each trip. Admins can invite and remove members before closure begins. A member with unsettled obligations must settle them before removal. Scope all history, receipts, messages, and photos by trip ID. Expose completed trips in a separate read-only history list. Owner-only deletion uses a privileged endpoint, explicit confirmation, and an audit log.
- **Expense proof.** Keep an expense receipt separate from repayment evidence. An expense with valid required evidence can post and create shares. For UPI, require the payment screenshot and the original bill when available. For cash, attach the bill if available. Any missing required evidence sends the expense to a trip admin for review before posting or creating shares. If the creator is also the reviewer, record the exception or route it to another admin when one is available. Protect receipts and screenshots with private delivery and scoped access.
- **Repayment proof and approval.** A debtor reports a repayment and attaches UPI proof when applicable. Proofless claims requiring an exception go to a trip admin, then to the recipient for confirmation. The recipient's confirmation alone settles the corresponding share. Rejection restores Due and records a reason. Use integer paise, server timestamps, atomic transitions and an append-only audit trail. Restrict approval to the assigned reviewer and make requests idempotent. Stop reminders for settled shares.
- **Trip closure.** After the end date, allow an admin to request completion only if every expense review and repayment is resolved. Freeze financial changes and membership in the same transaction that captures the list of participants. Notify everyone on that list to upload remaining photos and acknowledge completion. Verify no uploads are pending and every participant has acknowledged before closing automatically. Enforce read-only history on the server for ordinary members and admins, including deletion and media mutations. A closed trip can be viewed independently of all other trips.
- **Private live voice.** Use live-only encrypted media transport, short-lived trip-scoped room tokens, and no recording, audio storage, or transcription. For group calling through a media server, verify client-side end-to-end encryption and browser compatibility before claiming the provider cannot access audio. Keep voice messages separate as intentional uploads. Closed-app alerts open a tap-to-join flow on supported devices.
- **Nearby places, weather, and packing.** Use a places provider for actual places and a weather provider for forecast data. Ask permission before using location and show data source and update time. An optional Grok integration can summarize the results and tailor a packing list. Keep its key server-side and apply quotas. The demo checklist works without an API.

The current no-login demo includes installation, an in-app update prompt, a packing checklist, and simulated trip closure. Authentication, backend-enforced roles and proofs, background push, weather, nearby places and private live calls require the connected backend.

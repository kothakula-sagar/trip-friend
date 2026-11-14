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

## Connect the private trip workspace

The private workspace uses Firebase project `trip-friend-bd675`. Enable Email/Password in Firebase Authentication and add `kothakula-sagar.github.io` to Authorized domains. Create the default Firestore database in production mode. Publish the checked-in `firestore.rules` in the Firestore Rules tab, or deploy only those rules with `firebase deploy --only firestore:rules --project trip-friend-bd675` when authenticated as a project owner.

Test with two verified email accounts. The first account creates a trip and grants access to the second account by email. The second account should only see trips that include its verified address. Post an expense as the trip owner and check that both accounts see it. Each expense preserves the crew list that applied when it was posted. The workspace displays the latest 100 expenses and their balances.

### Email invitations

Enable **Email link (passwordless sign-in)** under Firebase Authentication → Sign-in method → Email/Password, alongside Email/Password. Publish the updated firestore.rules. With two separate browser profiles, send an invite from a trip owner, open the email in the other profile, confirm the invited address, and create a password. Verify that the member can open the trip and sign in again with their password. New trips and accepted invitations use Firebase user IDs. Older trips with email-based membership must be migrated before those accounts change email. The invite email uses Firebase's email-link template and sending quota.

### Ivory Regal UI refresh (1.2.0)

- `app.html` and `app.js`: Manali demo, responsive tab indicator, sample call sheet, packing progress and recap. Existing features keep their IDs. Existing local demo records are carried forward.
- `trips.html` and `trips.js`: shared glass header and trip cards with photo, crew, creation date and selected-trip balance.
- `index.html` and `help.html`: shared icon and demo styling.
- `aurora.css` and `icons.svg`: shared styles and line icons. The old `style.css` and `trips.css` were removed.
- `sw.js`, `release.js`, and `release.json`: bumped to 1.2.0 together. The service worker precaches the shared icon sprite and removes the old stylesheet from the precache. Private trip data continues to load through Firebase.

## Android package

The browser build stays static and the Android package opens the Manali demo on Home. Private trips remain accessible from Home. The Android shell is shared with `app.html` and only activates in Capacitor.

**Prepare a local build:** install Node 22+, Java 21, Android Studio and Android SDK Platform 36. Run `npm ci`, `npm run android:prepare`, `npx cap add android`, `npm run android:prepare`, then `npx cap sync android`. Only run `cap add` when the Android directory does not exist. Run `cd android && ./gradlew assembleDebug` for a test APK. Install `app/build/outputs/apk/debug/app-debug.apk` using Android Studio or `adb install`.

**Firebase Android registration:** add package `com.tripfriend.app` to existing Firebase project `trip-friend-bd675`, download `google-services.json` to the repository root locally, and rerun prepare/sync. On GitHub Actions store the file contents in `TRIP_FRIEND_GOOGLE_SERVICES_JSON`. Never put a Firebase service account key in the APK. Firestore rules and current roles are shared with the web app.

**Signed Android releases:** use GitHub Actions → Build Trip Friend Android → Run workflow → publish. Configure `TRIP_FRIEND_KEYSTORE_BASE64`, `TRIP_FRIEND_STORE_PASSWORD`, `TRIP_FRIEND_KEY_PASSWORD`, and `TRIP_FRIEND_KEY_ALIAS` as repository Actions secrets. Use the same signing key for every update and increment both the Android version code and version in release.json. Bump release.js and the cache name in sw.js when updating the web version. The workflow publishes TripFriend.apk and TripFriend.aab. Download the APK from the landing page and allow Android to install it from the source used for that download. Leave the signing key outside the repository.

**Plugins and permissions:** Capacitor App (back button and custom trip links), Haptics (taps), Share (trip link for existing members), Geolocation (foreground, approximate or precise location), and Push Notifications (Android 13+ notification permission, Firebase registration, channel setup and route on notification tap). Bundled WebView access and Firebase use Internet permission. Location is displayed locally. FCM event delivery needs a trusted notification sender and storage of device tokens. Camera/gallery currently use the existing file chooser. The app does not request background location, microphone, biometric or full-screen intent permissions in this build.

**Current scope:** demo plans, expenses, chat and photo drafts use browser/WebView local storage. Cross-device sync currently applies to existing Firebase trips, member invites, confirmed expenses and meeting points when connected. Android App Links for HTTPS invitation links, live location sharing, real encrypted calls, recording voice notes, biometric unlock and cloud upload queues are separate integrations.

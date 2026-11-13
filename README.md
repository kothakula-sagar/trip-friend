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

# Shopilot demo recording script

- **Target:** 85–90 seconds, 1920 × 1080, 30 fps.
- **Output location:** `/home/brian/Videos/shopilot-demo.mp4` (outside this Git repository).
- **Recording status:** Not recorded. The deployed Render URL, in-browser
  DeepSeek rendering, and Sandbox capture have not yet been verified, so no
  video is fabricated. A live API search did return Channel3 products with
  DeepSeek source.

## Final narration and shot list

| Time | Picture and action | Voiceover / on-screen caption |
| --- | --- | --- |
| 0–10s | Open on the Shopilot landing page. Hold on the wordmark and search prompt; use a gentle push-in. | **VO:** “Shopping can mean too much scrolling and too little confidence. Shopilot turns what you need into a focused product discovery experience.” **Caption:** “Less scrolling. Better matches.” |
| 10–30s | Type a natural-language request, submit it, and wait for actual Channel3 cards to render. Scroll slowly through results. | **VO:** “Tell Shopilot what you’re looking for in your own words. Channel3 searches its product catalog and returns real products, merchant offers, prices, and availability.” **Caption:** “Live product data · Channel3” |
| 30–45s | Show the DeepSeek recommendation heading and reasons beside product cards. Pause over the source label and one short reason. | **VO:** “DeepSeek ranks only the products returned for this search. The recommendation is an opinion; the product details remain grounded in Channel3’s results.” **Caption:** “DeepSeek recommendation · grounded in returned products” |
| 45–60s | Show a product’s merchant, price, stock status, then point to the external “View at” link. Do not follow it to a purchase. | **VO:** “A merchant link is a handoff to the retailer. Shopilot does not act as that retailer or claim to complete its purchase.” **Caption:** “Merchant handoff · no retailer checkout here” |
| 60–78s | Scroll to the separate PayPal area. Keep the notice and `$1.00 USD` sample item visible. Click the PayPal Sandbox button. Cut away during Sandbox sign-in/approval, then return to the real app’s successful capture state. | **VO:** “The separate PayPal flow is a one-dollar Sandbox demo item—not a Channel3 product. It is for testing only, with no real fulfillment or merchant purchase.” **Caption:** “Sandbox demo checkout — no real fulfillment or merchant purchase.” |
| 78–90s | Return to the top or a clean outro card with the verified live URL and stack labels. | **VO:** “Shopilot: Channel3 discovery, grounded DeepSeek recommendations, PayPal Sandbox, Next.js, and Render. Built for the PayPal AI Hackathon.” **Caption:** “Shopilot · [VERIFIED LIVE URL] · Built for the PayPal AI Hackathon” |

## Recording steps

1. Replace `[VERIFIED LIVE URL]` only after a public Render deployment is live
   and verified. Confirm the search source label says `deepseek`, then complete a
   real Channel3 search and a real Sandbox capture before recording.
2. Open the public URL in a clean browser window at 1920 × 1080 and 100% zoom.
   Close unrelated tabs, disable notifications, and use a neutral desktop
   background. Do not open developer tools, `.env` files, dashboards, logs, or
   credential settings.
3. Use OBS (or another screen recorder) to record the browser at 30 fps in
   1080p. Capture narration in a separate clean audio track or record the
   provided voiceover afterward. Keep captions large, high contrast, and inside
   the safe area.
4. Record the discovery sequence at a steady pace. Leave enough time for the
   real network request and `DeepSeek recommendation` label to appear. Do not replace
   results, labels, or checkout states with mock data.
5. Before clicking PayPal, verify the on-page no-fulfillment notice remains
   readable. Use a Sandbox buyer account only. During authentication and
   approval, pause the recording or cut to narration so no email, name, account
   details, or other personal information appears. Resume only after the actual
   app shows successful capture.
6. Record the close only after the Render URL, GitHub commit, and integration
   labels are verified. Inspect every frame for secrets, personal details, and
   unrelated browser chrome. Export H.264 MP4, 1920 × 1080, 30 fps, with AAC
   audio; save as `/home/brian/Videos/shopilot-demo.mp4`.
7. Review the exported file from start to finish, confirm it is 60–90 seconds,
   and upload it to the submission’s approved video host. Replace the video URL
   placeholder in `docs/submission.md` only after the upload is accessible.

## Screenshots to capture

- Landing page before a query.
- Live Channel3 results with the query and real merchant/price/availability
  facts visible.
- The `DeepSeek recommendation` source label and at least one grounded reason.
- A merchant handoff link with the disclosure that it opens the retailer.
- PayPal Sandbox notice and `$1.00 USD` sample item.
- The real successful capture state after approval (no Sandbox account screen).
- Closing frame showing the verified live URL and stack.

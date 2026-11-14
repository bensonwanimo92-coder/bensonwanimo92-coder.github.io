# SkyNest Property Network

A mobile-friendly nationwide property discovery and advertising front-end for Kenya.

## Nationwide experience
- County navigation for all 47 counties.
- County-aware discovery filtering alongside property type and town/estate search.
- Advertiser listing intake includes county, town, category, advert type, price, contact and availability.
- Responsive mobile, tablet and desktop layout.
- Search metadata and installable web-app shell.

## Frontend versus production services
This is a static GitHub Pages website. County navigation and preview interactions run in the browser. Sample cards remain illustrative, not verified vacancies. Advertiser forms do not create accounts, save adverts or publish inventory. A frontend change alone cannot guarantee 100x traffic or listing capacity.

## Production architecture for 100x growth
1. Firebase Authentication for advertisers, staff and admins; verified contact details and role claims.
2. Dedicated publicListings collection in the existing SkyNest Firebase project, separate from tenant, landlord, payment and private management records.
3. Workflow: draft → submitted → moderation → approved/published → paused/expired/archived. Advertisers cannot approve their own listings.
4. Firebase Storage with per-owner paths, file validation, resizing and CDN delivery.
5. Cursor-based pagination, Firestore composite indexes, bounded queries, caching, abuse throttling and usage monitoring.
6. Payment checkout with server-side webhook verification; never trust a browser-side paid flag.
7. Backend-triggered, opt-in notifications by county/category; no indiscriminate blasts.
8. Moderation queue, reporting, audit log, backups, analytics and error monitoring.

## Security boundaries
- Public clients read only approved, published, non-expired listing fields.
- Advertisers create/edit only their own drafts and submissions.
- Only trusted admin roles approve, publish or suspend listings.
- Never expose tenant records, rent/payment information, credentials or service-account keys in public documents.
- Storage rules validate ownership, MIME type and file size.
- Test rules against the Android schema in Firebase Emulator Suite before deployment.

## Next integration dependency
Configure a Firebase Web App in the same Firebase project as Android. Supply only public web config (apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId) and confirm Email/Password authentication is enabled. Never share a service-account JSON or private key.

## Firebase marketplace integration (staged)
- The advertiser portal now includes Firebase email/password registration and sign-in, email verification, cloud draft saving and submission for moderation.
- The public feed is wired to read only approved, unexpired records from the separate `publicListings` collection.
- A restricted moderation page uses the server-granted `marketplaceAdmin` custom claim to approve or reject submissions.
- Firebase web configuration is a public client configuration; it is not a service-account credential.

## Not live until backend rollout
The website integration is staged on a feature branch. It will not be live until the website change is merged and published, the marketplace Firestore rules and indexes are merged/deployed from the SkyNest Android integration repository, and the administrator bootstrap Cloud Function is deployed and successfully invoked by the verified administrator account. Property photo uploads, payments, featured-ad billing, analytics and Android app synchronization remain future work. Do not deploy permissive rules or expose private SkyNest collections to make the website work.

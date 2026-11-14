# SkyNest Property Network

A Kenya-wide marketplace for discovering and advertising property, vehicles, hospitality, restaurants, products, services and other legitimate opportunities.

## Marketplace experience
- Browse all 47 counties and search by category, county, town and budget.
- Advertiser Studio with verified email accounts and cloud drafts.
- Category-aware forms for homes, commercial spaces, land/farms, developments, vehicles, restaurants, hospitality, products, services and luxury adverts.
- Category-specific fields for vehicle specifications, land details, property features, commercial space, dining, hospitality and more.
- Multiple image uploads and short video clips, with client-side image resizing and upload limits.
- Public feed displays approved, unexpired listings only.
- Premium, Standard and Basic listing tiers are ordered in that priority, with newer adverts used as a secondary sort.
- Cookie consent supports reject optional, accept all and granular preferences; optional cookies remain off by default.
- Responsive layouts, category photography, reveal transitions and interactive controls.

## Moderation
- Pending adverts are private until reviewed.
- Admin review includes photo/video previews, category details and advertiser information.
- Admin can approve and publish, request changes with a reason, reject with a reason, assign an advertiser tier, and pause an already published advert.
- Advertisers can correct and resubmit adverts returned for changes.
- Admin actions record reviewer UID and timestamps.
- The initial administrator bootstrap is restricted by the matching UID and verified email; custom-claim administrators are also supported by Firestore rules.

## Firebase architecture and constraints
- Uses the existing Firebase project and the isolated `publicListings` collection; private tenant, landlord, house and payment records are not used for public discovery.
- Firebase Authentication email verification is required before advertisers can submit.
- Storage paths are owner-scoped: `listing_media/{ownerUid}/{listingId}/...`.
- Photos are limited to 10 per advert and 8 MB each before browser resizing; videos are limited to 3 per advert, 20 MB each and 60 seconds.
- Firestore and Storage rules must be deployed from the coordinated SkyNest Android integration repository before media uploads and expanded listing categories can be tested end-to-end.
- No Cloud Functions are required for basic draft upload and moderation; the Spark/free-plan requirement is retained. Storage quota and Firebase billing eligibility must be checked before accepting large volumes of video.
- Payments, paid tier checkout, advanced analytics, automated moderation, large-scale CDN strategy and load testing are not part of this first phase.

## Website-to-app integration
The public website reads approved, unexpired documents from `publicListings`. Android must read the same collection and understand the expanded category/media/tier fields for the advert to appear in its Inventory. That cross-platform end-to-end test remains a required acceptance test; this branch is not yet deployed.

## Release process
The work is staged on `feature/marketplace-expansion-phase1`. It must pass validation, be reviewed and merged, then be published by GitHub Pages. The coordinated Firestore and Storage rules change must also be reviewed, tested in Firebase emulators, merged and deployed before live uploads are enabled.

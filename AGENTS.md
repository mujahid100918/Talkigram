<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

# Project rules
- Follow relationships are separate from mutual friendship audiences; following never grants access to friends-only posts.
- Verification requests are owner-insertable pending rows; awarded badges live in a separate read-only account_verifications table writable only by trusted service-role review, preventing self-awarded authenticity badges.

- Media is stored in a private storage bucket (public buckets are blocked by workspace policy); uploads save a long-lived signed URL in the row via `src/lib/media.ts`.
- Direct media reads and URL signing are restricted to the authenticated upload folder owner; shared content uses the stored signed URL so uploads and message sharing remain functional without exposing every file.
- Like reads require an authenticated user; this preserves social feed counts while preventing anonymous enumeration.
- Social read policies for profiles, comments, stories and posts use TO authenticated with a non-null auth.uid() predicate and no anonymous SELECT grant; enforce sign-in in the database without breaking cross-user social features.
- Signed-in pages live under `src/routes/_authenticated/`, whose layout renders the shared app shell (nav + create modal).
- Data is read client-side with the browser client and React Query; access rules are enforced by row-level security.
- Shared app branding uses AppLogo with the generated icon asset; the favicon is a resized local copy so browser icons remain reliable.
- The primary feed queries public posts without a kind filter, with account-scoped cache keys and automatic polling; this includes reels and keeps new posts visible without relying on realtime publication configuration.
- Feed and profile media use shared MediaLightbox, mediaGallery normalization and MediaPostDetails; original authorized URLs and browser RLS queries preserve privacy while keeping galleries and persisted post interactions consistent.

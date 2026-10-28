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
- Gems: every AI server function charges via the `spend_gems` RPC before doing work and refunds via `credit_gems` (service role) on failure; prices live in `src/lib/gems.ts` with a margin test. Why: users must never get paid AI work for free, and failed work is never billed.
- Deadline pacing lives in `src/lib/pacing.ts` (`pacedOrder`) and wraps `studyOrder` on every study page. Why: one place decides cram vs. spread.
- Section colors come from `html[data-section]` set in `__root.tsx` (learn vs quiz). Why: same color means the same thing on every screen.
- Brand artwork is rendered through the shared BrandLogo component and asset pointer; StudySplash handles route loading. Why: welcome, courses and loading screens stay consistent without duplicating artwork references.
- Exam layouts reserve shared header space and expose distinct overview and study tabs. Why: mobile headings stay visible and home never doubles as flashcards.
- All read-aloud uses the shared podcast TTS narrator through flashcard-speech and speak, with cached clips, spend checks and refunds; flashcards auto-play on side/card changes and estimate highlighting from playback time. Why: keep Professor Lamby's voice consistent and prevent stale audio or unapproved spending.
- Flashcards measure the full question to set their minimum height and allow vertical page scrolling when player space is tight. Why: podcast controls must never truncate study text.
- Laptop (>=1024px) gets its own shell: exam tab bar becomes a left sidebar, class pages get WebTopBar, flatter bordered surfaces; `.web-only` elements are hidden on phones. Why: web has its own identity while mobile stays the baseline.
- Onboarding upload handoff persists File objects in IndexedDB until processing succeeds. Why: sign-in navigation and page reloads must not lose selected notes.

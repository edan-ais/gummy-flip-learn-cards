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

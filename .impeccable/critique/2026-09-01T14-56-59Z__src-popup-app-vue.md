---
target: critique addon
total_score: 28
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 3
timestamp: 2026-09-01T14-56-59Z
slug: src-popup-app-vue
---
# Critique — extension popup (src/popup/App.vue)

Method: single-context (degraded — no sub-agent; standing session constraint).
Assessment B (detect.mjs) ran in degraded regex mode (no HTML/CSS parser: contrast,
custom-property, structural checks skipped — undercount). No browser overlay available.

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Save confirmation is a sub-second stamp then popup closes; no per-field validation |
| 2 | Match System / Real World | 4 | Plain labels; monospace/terminal register fits the self-hoster audience |
| 3 | User Control and Freedom | 2 | No Cancel on form; edit-from-List has no back; no undo after delete |
| 4 | Consistency and Standards | 3 | Two indigos (#1d4ed8 accent vs #3730a3 chips); #666 vs #6b7280 greys |
| 5 | Error Prevention | 3 | Delete confirm + select constraints; already-saved -> edit guard |
| 6 | Recognition Rather Than Recall | 3 | Editing from List forces recall of which folder you were in |
| 7 | Flexibility and Efficiency | 2 | Tabs mouse-only despite role=tablist; no keyboard result nav; one-at-a-time editing |
| 8 | Aesthetic and Minimalist Design | 3 | Clean, but status dot pulses forever |
| 9 | Error Recovery | 3 | Typed errors -> plain messages -> Retry only where it helps; form state preserved |
| 10 | Help and Documentation | 2 | One sentence on setup; no token pointer, no inline help |
| Total | | 28/40 | Good (bottom of band) |

Cognitive load: 1/8 checklist failures (working memory — edit-from-List context loss). Low.

## Design Specificity Verdict

LLM: Authored after bolder/delight passes — monospace identity band, offset-shadow mark,
segmented mono tabs, committed indigo, save-stamp give a real POV. Form and list rows are
conventional, which is correct for Operate. Character leaks inconsistently only at the tag
chips (own indigo, never retokened).

Detector: 12 advisory design-system-color findings, no false positives:
- TagInput.vue: #3730a3 x2, #e0e7ff x2, #2a2a3a, rgba(0,0,0,0.12) — second indigo family
- BookmarkBrowser.vue: #666, #bfdbfe, #1e293b, #444, #333
- QuickSearch.vue: #666
Detector + review agree on the tag-chip indigo mismatch and the #666/#6b7280 grey drift.
A11y findings below are review-only (degraded parser).

## What's Working

1. Error handling is real: typed errors -> plain-language messages -> Retry only for
   Network/Server; form state survives a failed save.
2. Identity register fits the audience — homelab instrument, not SaaS widget.
3. List tab breadcrumb drill-down is low-cognitive-load IA in 340px.

## Priority Issues

- [P1] Two indigos in one popup. Tag chips #3730a3/#e0e7ff vs accent #1d4ed8. Contradicts
  the one-committed-accent thesis. Fix: retoken TagInput chips to accent/tint; kill #666
  greys for muted #6b7280. -> /impeccable colorize

- [P1] Edit-from-List destroys browsing position. Edit on a row flips to the form; returning
  to List remounts BookmarkBrowser (v-if) and resets the breadcrumb to root. No "back to
  list" affordance. Fix: preserve List state (v-show or lift crumb stack), add a back link
  in the form when opened via editFromList. -> /impeccable harden

- [P1] Tab bar claims an ARIA pattern it doesn't implement. role=tablist/tab/aria-selected
  set, but no tabpanel wiring, no roving tabindex, no arrow-key handler. Worse than plain
  buttons for screen readers. Fix: implement the full pattern or drop the roles.
  -> /impeccable harden

- [P2] Save moment too quiet for the core action. 220ms stamp then window.close(); no
  "Saved" text, no button success state, no aria-live. Fix: hold ~450-500ms explicit
  "Saved" state with aria-live=polite before close. -> /impeccable delight

- [P2] Status dot pulses forever. 3s infinite box-shadow breath, peripheral, undismissable
  (unless prefers-reduced-motion). Makes DESIGN.md self-contradict. Fix: pulse 2-3x on
  connect then settle; reconcile DESIGN.md motion section. -> /impeccable quieter

## Persona Red Flags

Alex (Power User): tab switching click-only, no Ctrl+1/2/3, no arrow keys despite tablist
role; no j/k result nav; edit-from-List one-at-a-time with context reset between each.

Sam (Accessibility): unbacked tablist role; connection state is color + title attr only (not
announced); no aria-live for save/delete/errors and popup closes before anything could be;
focus not managed on tab switch.

Jordan (First-Timer): List vs Search difference unexplained; List opens on a bare folder
list (reads as empty/broken); no help link; setup screen has no "where's my token?" pointer.

Devi (homelab self-hoster, from PRODUCT.md): popup never shows which instance/account it's
bound to beyond a green dot; auth-error notice describes the fix but doesn't deep-link to
options.

Casey (mobile): n/a — desktop browser popup.

## Minor Observations

- #666 vs muted token #6b7280 — consolidate.
- window.confirm for delete drops out of the visual world.
- Setup heading "Set up" is abrupt next to the identity band.
- DESIGN.md motion section contradicts itself post-delight.
- .impeccable/live/config.json, PRODUCT.md, DESIGN.md, src/preview/ all uncommitted.

## Questions to Consider

- Do List and Search need to be separate tabs, or is List = Search with empty query + folder
  scope? Merging -> 2 tabs, removes the confusion.
- What does a confident saved moment look like — is 220ms enough?
- Ideal path for editing five bookmarks in one folder?

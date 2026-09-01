---
target: critique addon
total_score: 34
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 0
timestamp: 2026-09-01T15-20-47Z
slug: src-popup-app-vue
---
# Critique #2 — extension popup (src/popup/App.vue), after harden/colorize/polish

Method: single-context (degraded — no sub-agent; standing session constraint).
Assessment B (detect.mjs) degraded regex mode (no contrast/structural). No browser overlay.

## Design Health Score

| # | Heuristic | Score | Δ | Key Issue |
|---|-----------|-------|---|-----------|
| 1 | Visibility of System Status | 3 | — | Sighted save feedback still only the 220ms stamp; no field-level validation |
| 2 | Match System / Real World | 4 | — | Plain terminal register |
| 3 | User Control and Freedom | 3 | +1 | Back-to-list + two-stage delete cancel window; no post-delete undo |
| 4 | Consistency and Standards | 4 | +1 | One indigo family (detector 12->0); .edit chip still bordered |
| 5 | Error Prevention | 4 | +1 | Two-stage inline delete replaced native confirm |
| 6 | Recognition Rather Than Recall | 4 | +1 | Edit-from-List keeps folder position |
| 7 | Flexibility and Efficiency | 3 | +1 | Full keyboard tab nav; no Ctrl+1-3, no result-list keys, no bulk |
| 8 | Aesthetic and Minimalist Design | 4 | +1 | Color consolidation + borderless tertiary actions; status breath loops |
| 9 | Error Recovery | 3 | — | AuthError deep-links to Settings; 422s don't name the field |
| 10 | Help and Documentation | 2 | — | No token hint, no List-vs-Search orientation, no docs link |
| Total | | 34/40 | +6 | Good (top of band) |

Cognitive load: 0/8 failures (was 1/8). Low.

## Design Specificity Verdict

Still authored, tighter. One #1d4ed8 family strengthens the accent thesis; borderless
mono tertiary actions rhyme with the mono tab labels — the type system reads as
deliberate. detect.mjs returns [] (was 12 findings). One documented ignore-value
stands (popover shadow rgba(0,0,0,.12)). Degraded mode: not a contrast/structure
clean bill.

## What's Working

1. Keyboard/AT story complete and honest — real tab pattern (roving tabindex,
   arrow/Home/End, aria-controls, role=tabpanel), consistent :focus-visible,
   aria-live outcome announcements.
2. Destructive action safe and in-world — two-stage inline Delete replaced a
   dismissable native confirm; real cancel window.
3. One accent enforced — indigo family only saturated color; one grey; sub-3:1
   borders removed. Detector 12 -> 0.

## Priority Issues

- [P2] Sighted users get no explicit "saved" confirmation. aria-live is sr-only;
  everyone else sees a 220ms stamp then window.close(). Fix: held visible success
  state on the primary button before the 400ms close. -> /impeccable delight

- [P2] 422 validation errors don't name the field. Renders as one ErrorNotice
  string. ValidationError already carries fields:Record<string,string[]>, unwired.
  Fix: map to per-input messages + focus first offender. -> /impeccable harden

- [P2] "List" vs "Search" unexplained. Both show bookmarks; List opens on a bare
  folder list (reads as empty). Fix: one line of orienting copy, or merge List
  into Search as a folder-scope filter. -> /impeccable clarify or /impeccable shape

- [P3] No token guidance on setup — never says where the API token comes from.
  -> /impeccable clarify

- [P3] .edit chip is the last bordered tertiary action (1px #d1d5db, sub-3:1,
  sans 600) while Back-to-list / Load-more went borderless mono. -> /impeccable polish

## Persona Red Flags

Alex: keyboard tab nav works but no Ctrl+1-3; Search Enter opens only result #1,
no j/k; multi-bookmark edit still sequential (no longer context-reset); no bulk.

Sam: strong now. Gaps: visible-only save stamp has no sighted-parity text; 422s
don't move focus to / name the bad field; Delete label swap may not re-announce
while focused.

Jordan: List vs Search unexplained; List opens on bare folder list; no help link;
no token-source hint on setup.

Devi (homelab self-hoster): AuthError -> Settings button is a real fix; still no
"which instance am I connected to" beyond the green dot.

## Minor Observations

- .edit chip border (above).
- liveMessage never clears after save — harmless in real popup, lingers in harness.
- DESIGN.md large; sidecar split for motion/shadow worth considering later.

## Questions to Consider

- Is 220ms stamp enough of a "done" signal for sighted users, or hold a success state?
- Does merging List into Search remove more confusion than it costs?
- Is field-level 422 mapping worth wiring, given the server is the real validator?

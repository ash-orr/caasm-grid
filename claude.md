# CAASM UI

## Project brief
This repository contains the CAASM UI prototype and frontend implementation for the assets table and related filtering/saved-view behaviors.

## Working rules
- Preserve any in-progress work already present in the repo before making feature changes.
- Prefer targeted, minimal edits over broad rewrites.
- When implementing behavior from the prototype or spec, follow the user-visible semantics over the implementation details.
- Keep tests focused on real behavior and update them when UI logic changes.

## Key implementation notes
- The Manage filters dialog replaces the old Add filter popover.
- Hidden default sections are view state, not permanent filter state.
- Hidden defaults must be restored by saved views and included in unchanged detection.
- Newly checked sections should open and appear after existing visible sections when applied.
- Unchecked sections should be hidden and their values cleared when applied.
- Search in the dialog filters the list of sections while preserving count semantics.
- Escape and Cancel should discard staged changes without mutating current state.

## Important files
- `design/CHANGES-SINCE-SPEC.md`
- `design/prototype/caasm-console.html`
- `frontend/src/components/AssetsTable/AssetsTable.tsx`
- `frontend/src/components/AssetsTable/ManageFiltersDialog.tsx`
- `frontend/tests/manage-filters.test.tsx`
- `frontend/e2e/manage-filters.spec.ts`

## Validation
Before claiming completion, run the relevant verification commands for the changed behavior, including the targeted test suite and the broader repo checks if requested.

## Final requirement
When the task is fully complete and the repo is ready for handoff, provide only the exact final artifact requested by the user, without extra commentary or explanation.

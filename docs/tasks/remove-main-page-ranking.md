# Remove Main Page Ranking Duplication

## Plan

- Add a route-level regression test for the main Record Match page that fails while the Ranking section is still rendered.
- Remove the duplicated Ranking collapsible from the main route without changing the Stats page.
- Verify with targeted tests and `yarn typecheck`.

## Review

- Removed the duplicated `Ranking` collapsible from the main Record Match route so ranking is now only exposed on the Stats page.
- Added a route regression test asserting the main page does not render a `Ranking` section title.
- Verification:
- `yarn test --run src/routes/index.test.tsx`
- `yarn typecheck`

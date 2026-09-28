# Alarm snapshot ordering

Use Node.js 24.19.0. Save model.mjs, fixtures.mjs, demo.mjs, self-test.mjs and practice.mjs in one directory.

Run `node demo.mjs`, `node --test self-test.mjs`, then `node practice.mjs`.

The model sorts already-consolidated occurrence snapshots. It does not ingest raw alarm transitions. Rule: severity descending, trusted time first, nominal UTC ascending, then source/condition/occurrence ASCII identity. Unknown time remains unknown; receipt time is diagnostic. Exact duplicate rows collapse, conflicting copies reject the entire snapshot. Input cap is 100 rows. Frozen snapshots provide stable offset pages; rebuilding between pages is not covered.

Practice changes B to severity 950, putting it first. Change bSeverity to 700 to restore the original order. Zero rejects explicitly. No network, PLC, OPC UA client, authentication or persistent snapshot service is implemented.

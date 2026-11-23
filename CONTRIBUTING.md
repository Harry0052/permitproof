# Contributing

Issues and pull requests are welcome on [Harry0052/permitproof](https://github.com/Harry0052/permitproof).

## Local check

```bash
npm ci
npm test
npm run demo
```

`npm test` typechecks through the build, runs Vitest, and the demo writes `out/demo/report.json`. The documented retail fixture must stay `reviewed-rule` / `rule-nc2-general-retail-2026` with `approval` false.

## Data rules

- Keep parcels synthetic. Ids start with `SYN-`. Display names include the word `SYNTHETIC`.
- Do not add real street addresses, owner names, or permit numbers.
- Do not commit secrets, `.env` files, or proprietary ordinance compilations.
- A new rule needs an https URL on the source allowlist, `content_origin: published-code-reading`, a code section, an effective window, and `evaluated: false` on every condition. Detached PDF text is rejected.
- If you change a fixture file, update `fixtures/manifest.json` so the sha256 entries match. `npm test` checks them.
- Update `fixtures/oracle/acceptance.json` when a confirmation category or selected rule changes, and say why in the pull request.

## Commits

Use a conventional commit prefix such as `feat`, `fix`, `docs`, `test`, `refactor`, or `chore`.

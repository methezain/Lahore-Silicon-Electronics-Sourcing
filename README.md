# Lahore Silicon

Hall Road component counter. The catalog is the JSON files in `src/content/components/`.

## Run

```sh
npm install
npm run dev
```

The dev server is `http://localhost:4321`.

## Orders database

D1 binding `DB`, database name `electronics-sourcing-db`. `db/schema.sql` creates `Orders` if it is missing. It does not drop the table.

```sh
npx wrangler d1 execute electronics-sourcing-db --local --file=db/schema.sql
```

Add `--remote` for the deployed database.

If the table already exists from before the `destination` column, run this once:

```sh
npx wrangler d1 execute electronics-sourcing-db --local --file=db/migrations/0002_destination.sql
```

## Contributing

Copy `.env.example` to `.env`. Leave a variable unset when the owner has not supplied it.

```sh
npm install
npx wrangler d1 execute electronics-sourcing-db --local --file=db/schema.sql
npm run check
npm run lint:css
npm run lint:src
npm test
npm run test:e2e
```

`npm run dev` serves `http://localhost:4321`. Playwright reuses a server already on that port. Install the browser once with `npx playwright install chromium`. `npm run test:visual` and `npm run lhci` are the hooks for screenshot baselines and Lighthouse CI.

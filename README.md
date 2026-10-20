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

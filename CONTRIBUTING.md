# Contributing to LABLOG

Thank you for helping improve LABLOG. Contributions of code, design,
documentation, testing, translations, and ideas are welcome.

## Before you start

1. Search existing issues and pull requests to avoid duplicate work.
2. For a larger change, open a feature request and discuss the approach first.
3. Never include real credentials, personal data, or private lab content.
4. Follow the [Code of Conduct](CODE_OF_CONDUCT.md).

## Development workflow

1. Fork the repository.
2. Create a focused branch from `main`:

   ```bash
   git checkout -b feat/short-description
   ```

3. Install dependencies with `npm install`.
4. Copy `.env.example` to `.env.local` and use your own Supabase project.
5. Run the migrations in `supabase/migrations` in filename order.
6. Make a small, focused change.
7. Validate it:

   ```bash
   npm run lint
   npm run build
   ```

8. Commit with a clear message and open a pull request.

## Project conventions

- Use TypeScript for application code.
- Keep interactive UI accessible to keyboard and touch users.
- Preserve the existing App Router structure.
- Add a new timestamped SQL migration instead of editing a deployed migration.
- Do not weaken Supabase Row Level Security policies to make a feature work.
- Update documentation when behavior or setup changes.

This project uses Next.js APIs that may differ from earlier versions. Before
changing framework conventions, read the relevant local documentation in
`node_modules/next/dist/docs`.

## Pull request checklist

- The change solves one clear problem.
- Lint and production build pass locally.
- New UI works on narrow and wide screens.
- New interactions have accessible names and keyboard behavior.
- Database changes include a migration and appropriate RLS policies.
- No secrets, generated output, or personal data are committed.

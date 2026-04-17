# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- **Install**: `pnpm install` (pnpm is enforced via `packageManager` field)
- **Test**: `pnpm test`
- **Test single file**: `node --test test/smtp.test.js`
- **Test by name**: `node --test --test-name-pattern="should send email" test/smtp.test.js`
- **Test with coverage**: `pnpm run test:cov`
- **Lint**: `pnpm run lint`
- **Lint + fix**: `pnpm run lint:fix`

SMTP tests require Mailpit: `docker run -d -p 1025:1025 -p 8025:8025 axllent/mailpit:latest`

## Architecture

ESM-only (`"type": "module"`) library using a **factory/closure pattern** throughout — no classes.

Entry point (`index.js`) calls `lib/index.js` which:
1. Validates config via `lib/config.js` (env-schema)
2. Selects transport: `lib/postal.js` (Postal API) or `lib/smtp.js` (nodemailer SMTP)
3. Returns `{ sendMail, compileHtmlBody, compilePlainBody }`

Template compilation (`lib/utils.js`): reads MJML templates from locale directories (`templates/en/`, `templates/de/`), processes layout inheritance via frontmatter (`<!-- @meta -->`), compiles with Handlebars, then converts MJML to HTML. `compileHtmlBody` is async.

## Code Style

See AGENTS.md for detailed conventions. Key points:
- `@antfu/eslint-config` with Stroustrup brace style (`else` on new line)
- No semicolons, single quotes, no trailing commas
- camelCase for variables/functions, kebab-case for files
- `assert` for input validation in library code, bare `catch {}` for I/O errors

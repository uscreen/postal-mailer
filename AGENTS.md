# Agent Guidelines for postal-mailer

## Overview

`@uscreen.de/postal-mailer` is an ESM-only Node.js library for sending transactional
emails via Postal API or SMTP. It compiles MJML templates with Handlebars, supports
layout inheritance, i18n via locale-based template directories, and frontmatter metadata.

## Build/Test Commands

- **Install**: `pnpm install` (use pnpm, not npm — enforced via `packageManager` field)
- **Lint**: `pnpm run lint` (ESLint with `--fix`)
- **Test all**: `pnpm test` or `node --test test/*.test.js`
- **Test single file**: `node --test test/api.test.js` (replace with specific test file)
- **Test single case**: `node --test --test-name-pattern="pattern" test/api.test.js`
- **Test with coverage**: `pnpm run test:cov` (HTML + text report via c8)
- **Test CI**: `pnpm run test:ci` (LCOV + text report for Coveralls)

### Important Notes

- Node.js 20+ is required (for `node:test` runner features). CI tests against 20, 22, 24.
- `.nvmrc` specifies Node 24. The project uses direnv (`.envrc`) for automatic version switching.
- SMTP tests (`test/smtp.test.js`) require a running Mailpit instance on ports 1025/8025.
  Start it via: `docker run -d -p 1025:1025 -p 8025:8025 axllent/mailpit:latest`
- API tests (`test/api.test.js`) use nock to mock HTTP — no external services needed.
- Layout tests (`test/layout.test.js`) use temp directories — no external services needed.

## Project Structure

```
index.js                   # Package entry point, re-exports lib/index.js
lib/
  index.js                 # Core factory: validates config, selects transport
  config.js                # env-schema based configuration validation
  utils.js                 # Template compilation (MJML, Handlebars, layouts)
  postal.js                # Postal API transport (@atech/postal)
  smtp.js                  # SMTP transport (nodemailer)
test/
  helper.js                # Test builder factory (build function)
  interceptor.js           # Nock HTTP body-matching helper
  noop.test.js             # Smoke test
  api.test.js              # Postal API transport tests (uses nock)
  smtp.test.js             # SMTP transport tests (requires Mailpit)
  layout.test.js           # Layout inheritance tests (uses temp dirs)
  templates/               # Test MJML templates organized by locale (en/, de/)
examples/                  # Example usage for api and smtp transports
```

## Module System & Imports

This is an **ESM-only** project (`"type": "module"` in package.json).

### Import ordering convention (observed pattern)

1. Node.js built-ins with `node:` protocol prefix
2. Third-party packages (bare specifiers)
3. Relative imports (always with `.js` extension)

```js
import assert from 'node:assert'           // 1. Node built-ins
import { test, describe } from 'node:test'
import nock from 'nock'                     // 2. Third-party
import app from '../index.js'              // 3. Relative (always .js ext)
import { build } from './helper.js'
```

### Export patterns

- **`export default`** for main module exports (all lib/ files, entry point)
- **Named `export { name }`** for utility/helper exports (test helpers)

## Code Style & Formatting

### Prettier rules (`.prettierrc`)

- No semicolons, single quotes, no trailing commas, bracket spacing enabled

### ESLint

Uses `@uscreen.de/eslint-config-prettystandard-node` (extends StandardJS + Prettier).

### Naming Conventions

- **Files**: kebab-case (`test-with-subject.mjml`, `html-to-text`)
- **Variables/functions**: camelCase (`compileHtmlBody`, `sendMail`, `postalDefaults`)
- **Config properties**: camelCase (`postalServer`, `postalKey`, `postalTransport`)
- **Internal markers**: double-underscore prefix (`__pmtransport`)
- **No UPPER_SNAKE_CASE** constants — everything is camelCase

### Brace Style

Stroustrup style — `else` on a new line after the closing brace:

```js
if (contentMatch) {
  content = contentMatch[1].trim()
}
else {
  content = content.trim()
}
```

## Architecture Pattern

Every module follows a **factory function / closure pattern**. Modules export a function
that receives config and returns an object of methods. No classes are used.

The initialization chain: `index.js` -> `lib/index.js` -> `config.js` (validate) ->
select transport (`postal.js` or `smtp.js`) -> return `{ client, sendMail, compileHtmlBody, compilePlainBody }`.

## Error Handling

### In library code — use `assert` for input validation

```js
assert(template, 'providing a value for template is required')
assert(typeof template === 'string', 'template should be a string')
```

### In library code — try/catch with graceful fallback for I/O

```js
try {
  layoutContent = fs.readFileSync(layoutPath, { encoding: 'utf8' })
} catch (error) {
  console.error(`Layout not found: ${layoutName}`)
  return `<mjml><mj-body>${content}</mj-body></mjml>`
}
```

### In tests — use `assert.rejects()` with predicate functions

```js
await assert.rejects(
  () => app.sendMail(payload),
  (error) => error && error.code === 'ERR_ASSERTION' && error.operator === '==',
  `should fail on missing property ${prop}`
)
```

## Test Patterns

### Framework: Node.js built-in test runner (`node:test`)

- Use `describe()` for grouping, `test()` for individual cases
- Use `beforeEach()` / `afterEach()` for setup/teardown
- Assertions: `assert.ok()`, `assert.strictEqual()`, `assert.match()`,
  `assert.doesNotMatch()`, `assert.rejects()`, `assert.deepStrictEqual()`
- HTTP mocking: `nock` with custom interceptor (`test/interceptor.js`)
- Test builder: `build()` factory from `test/helper.js` creates configured app instances

### SMTP testing with Mailpit

- Docker: `axllent/mailpit:latest` on ports 1025 (SMTP) / 8025 (Web UI)
- API: `http://localhost:8025/api/v1/` — custom `mailpitClient()` uses built-in `fetch()`
- Cleanup: `DELETE /api/v1/messages` between tests

## Template System

- Templates live in locale directories: `templates/en/`, `templates/de/`
- Frontmatter uses HTML comment delimiters: `<!-- @meta ... -->`
- Layout inheritance: `layout: base` in frontmatter references `layouts/base.mjml`
- Content blocks: `<!-- @content -->...<!-- @endcontent -->`
- Style blocks: `<!-- @styles -->...<!-- @endstyles -->`
- Layouts use triple-stache `{{{content}}}` for unescaped HTML insertion

## Configuration

Uses `env-schema` (Fastify ecosystem) with JSON Schema validation. Required properties:
`postalTemplates` (string, default `./templates`), `postalServer` (string),
`postalKey` (string). Optional: `postalTransport` (enum: postal/smtp, default `postal`),
`postalPort` (number, default 25), `postalUser`, `postalSender`, `postalAssetsUrl`,
`postalDefaultLocale` (all strings, default empty).

## CI/CD

- GitHub Actions (`.github/workflows/main.yml`)
- Triggers on push/PR to `master`/`main`
- Matrix: Node.js 20, 22, 24
- Uses pnpm with `pnpm/action-setup@v4`
- Starts Mailpit via `docker run` for SMTP tests
- Coverage uploaded to Coveralls
- Dependabot auto-merge for dependency updates

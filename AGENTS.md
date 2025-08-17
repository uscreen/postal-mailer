# Agent Guidelines for postal-mailer

## Build/Test Commands
- **Lint**: `pnpm run lint` (ESLint with auto-fix)
- **Test all**: `pnpm test` or `node --test test/*.test.js`
- **Test single file**: `node --test test/api.test.js` (replace with specific test file)
- **Test with coverage**: `pnpm run test:cov` (HTML report in `coverage/`)
- **Test CI**: `pnpm run test:ci` (LCOV report for Coveralls)
- **Install**: `pnpm install` (use pnpm, not npm)

## Code Style & Architecture
- **Package manager**: pnpm (enforced in packageManager field)
- **Node.js version**: 20+ required (for `node --test` features)
- **ESLint**: Uses `@uscreen.de/eslint-config-prettystandard-node`
- **Prettier**: No semicolons, single quotes, no trailing commas, bracket spacing
- **Module system**: ESM only (`"type": "module"`)
- **Imports**: Use `import`/`export`, add `.js` extensions for relative imports
- **Naming**: camelCase for variables/functions, kebab-case for files
- **Error handling**: Use Node.js `assert` module, `assert.rejects()` for async errors, `assert.deepStrictEqual()` for object comparison
- **Test framework**: Node.js built-in test runner (`node:test`)
- **Test structure**: Use `test()` and `describe()` with `beforeEach()`/`afterEach()`
- **Mocking**: Use `nock` for HTTP, custom interceptors in `test/interceptor.js`
- **Coverage**: c8 for HTML reports and LCOV (for CI/Coveralls)
- **File organization**: Separate transports (postal/smtp), utils, config
- **Exports**: `export default` for main exports, `export { ... }` for utilities

## SMTP Testing with Mailpit
- **SMTP server**: Mailpit (axllent/mailpit) replaces MailHog for email testing
- **Docker service**: `axllent/mailpit:latest` on ports 1025 (SMTP) / 8025 (Web UI)
- **API endpoint**: `http://localhost:8025/api/v1/` for REST API access
- **Test integration**: Custom `mailpitClient()` in `smtp.test.js` using fetch() API
- **Message verification**: GET `/api/v1/messages` for message list, GET `/api/v1/message/{ID}` for full content
- **Cleanup**: DELETE `/api/v1/messages` to remove all messages between tests
- **Zero dependencies**: No npm packages needed, uses built-in fetch() for API calls
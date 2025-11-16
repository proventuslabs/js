# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a monorepo for managing a collection of JavaScript/TypeScript packages. The project follows Single Responsibility Principle (SRP) design, where each package focuses on one specific concern. It's managed with pnpm workspaces, Turbo, and release-please for automated publishing to NPM and JSR.

## Development Environment

### Runtime

NodeJS 22+
TypeScript 5.9+

### Using Nix (Recommended)
A local development shell with all required dependencies is available using Nix:

```bash
# Enter development shell with Node.js 22+ and all dependencies
nix develop
```

This provides an isolated environment with all necessary tools.

### Common Development Commands

```bash
# Generate a new package from template
pnpm generate

# Watch mode for development
pnpm dev

# Build all packages
pnpm build

# Type checking
pnpm check-types

# Run tests
pnpm test

# Run E2E tests only
pnpm test:e2e

# Run unit tests only
pnpm test:unit

# Lint and format code
pnpm style
pnpm repo:style
```

## Architecture

### Package Structure
Each package follows a consistent structure:
- Built with `tsdown` to multiple formats (CommonJS, ESM, IIFE) with ES2020 target
- Uses Node.js native test runner (`node --test`)
- Type checking with `tsc --noEmit`
- Linting with Biome

### Package Generation
Use `pnpm generate` to create new packages from templates in `turbo/templates/`. Each package:
- Located in `packages/<name>/`
- Exports from `src/index.ts`
- Includes comprehensive tests and JSR publishing configuration
- Follows consistent build and publishing patterns

### Package Design Principles
Each package should:
- Follow Single Responsibility Principle (SRP) - focus on one specific concern
- Use standard JavaScript/TypeScript APIs and well-known standards when applicable
- Provide configurable behavior through type-safe options
- Include comprehensive tests and documentation

## Code Standards

### Import Organization (Biome)
Imports are automatically organized into groups:
1. Built-ins (URL, Node, Bun)
2. External packages
3. Aliases
4. Relative paths

### Test Configuration
Tests use Node.js test runner with native TypeScript transpilation.

**BDD Approach**: Tests follow Behavior-Driven Development principles, focusing on observable behavior rather than implementation details. Test descriptions should express what the system does from a user/consumer perspective, avoiding references to internal implementation details like function names, variable names, or internal state management.

#### Test File Types
- **Unit tests** (`*.test.ts`): Test individual package behavior with mocked dependencies
- **E2E tests** (`*.e2e-test.ts`): Test packages with real integrations and dependencies

#### Test Conventions
1. **Context usage**: Always pass `TestContext` as parameter and use `ctx.assert` for assertions
2. **Test planning**: Use `ctx.plan(N)` to declare expected assertion count
3. **AAA pattern**: Clearly separate Arrange, Act, Assert sections with comments
4. **Descriptive names**:
   - `describe()` blocks describe observable behaviors and scenarios
   - `it()` descriptions start with "should" and describe expected behavior
   - Avoid implementation details in test names and descriptions
5. **Mocking with context**: Use `ctx.mock` for mocks
6. **Timer mocking**: Use `ctx.mock.timers.enable()` for time-dependent tests
7. **Nested tests**: Use `ctx.test()` for sub-test cases within a test
8. **Async helpers**: Use helper functions like `flushMicrotasks()` for async control
9. **E2E setup**: Use `ctx.after()` for cleanup and `ctx.signal` for abort handling
10. **Coverage exclusion**: Add `/* node:coverage disable */` after imports for test files

## Build System

- **Turbo**: Orchestrates builds with dependency resolution
- **tsdown**: Handles TypeScript compilation and bundling
- **Biome**: Handles linting, formatting, and import organization
- **pnpm**: Workspace and dependency management
- **release-please**: Automated versioning and publishing

## Automation & Release Process

### Automated CI/CD Pipeline
The project uses a comprehensive automation setup:

**CI (Continuous Integration):**
- Triggered on PRs targeting `main` branch
- Centralized CI workflow (`packages.ci.yaml`) detects changed packages and runs CI for each
- Uses template workflow (`_template.package-ci.yaml`) for consistency across packages
- Turbo cache optimization for faster builds

**CD (Continuous Deployment):**
- Fully automated via `release-please` on merge to `main`
- Creates release PRs with conventional commit-based changelog
- Publishes to both NPM and JSR registries automatically
- Uploads build artifacts to GitHub releases

### Adding New Packages

**Automated Generation:**
```bash
pnpm generate  # Creates package from turbo templates
```

**Manual Configuration Required:**
1. **JSR Package Scope** (One-time setup by @proventuslabs org owner):
   - **IMPORTANT**: Before publishing, an owner of the `@proventuslabs` organization on JSR must create the package scope
   - Navigate to JSR and create the package: `@proventuslabs/<package-name>`
   - This step is required or the automated publishing will fail

2. **Release Configuration** (`release-please-config.json`):
   ```json
   "packages/<package-name>": {
     "extra-files": [
       {
         "type": "json",
         "path": "packages/<package-name>/jsr.json",
         "jsonpath": "$.version"
       }
     ]
   }
   ```

3. **CI Workflow** (`.github/workflows/packages.ci.yaml`):
   Add package to the `detect-changes` job filters:
   ```yaml
   # Add to outputs:
   outputs:
     "packages/<package name>": ${{ steps.filter.outputs['packages/<package name>'] }}

   # Add to paths filter:
   filters: |
     "packages/<package name>":
       - 'packages/<package name>/**'
       - '.github/workflows/_template.package-ci.yaml'
   ```

   Add CI job for the package:
   ```yaml
   # Add new job:
   <package-name>:
     needs: detect-changes
     if: needs.detect-changes.outputs['packages/<package name>'] == 'true'
     uses: ./.github/workflows/_template.package-ci.yaml
     with:
       package-name: <package-name>
   ```

4. **CD Workflow** (`.github/workflows/packages.cd.yaml`):
   Add package output mapping to `release-please`:
   ```yaml
   outputs:
     "packages/<package name>--tag_name": ${{ steps.release.outputs['packages/<package name>--tag_name'] }}
     "packages/<package name>--release_created": ${{ steps.release.outputs['packages/<package name>--release_created'] }}
   ```

   Add release job for the package:
   ```yaml
   <package name>:
     name: <package name>
     needs: release-please
     if: ${{ needs.release-please.outputs['packages/<package name>--release_created'] == 'true' }}
     uses: ./.github/workflows/_template.package-cd.yaml
     with:
       package_path: "packages/<package name>"
       package_name: "@proventuslabs/<package name>"
       package_tag: ${{ needs.release-please.outputs['packages/<package name>--tag_name'] }}
     secrets:
       NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
   ```

### Commit Requirements
- **Squash-merge only** - all commits must be squashed when merging PRs
- **Conventional Commits** - required for release-please automation:
  - `feat:` - new features (minor version bump)
  - `fix:` - bug fixes (patch version bump)
  - `feat!:` or `fix!:` - breaking changes (major version bump)
  - `chore:`, `docs:`, `ci:`, `refactor:` - no version bump

### Template System
Templates in `turbo/templates/` generate (via `pnpm generate`):
- Package structure with proper naming conventions
- JSR and NPM publishing configuration
- Consistent build setup (tsdown, biome, node test runner)
- TypeScript configuration aligned with monorepo standards

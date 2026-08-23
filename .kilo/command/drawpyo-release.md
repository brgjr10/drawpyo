# Drawpyo Release Skill

Automate the full drawpyo feature-review, npm-publish setup, commit, and push workflow.

## Prerequisites

- Working directory must be `\\zimaserver\ZimaOS-HD\AppData\Projects\drawpyo`
- Git user must be configured as `brgjr10`
- Remote must be `https://github.com/brgjr10/drawpyo.git`

## Steps

1. **Review instructions against codebase**
   - Read `instructions.md`
   - Inspect the project structure
   - Identify missing or incomplete feature requests

2. **Implement missing features**
   - Edit existing files to match the instructions
   - Preserve existing architecture and code style

3. **Set up npm publishing for GitHub Packages**
   - Ensure `package.json` has correct `name`, `repository`, and `publishConfig`
   - Create `.npmrc` with `@brgjr10:registry=https://npm.pkg.github.com`
   - Create `.npmignore` excluding build artifacts, node_modules, etc.

4. **Commit and push**
   - `git add -A`
   - Commit with descriptive message
   - Push to `origin/main`

## Output

Provide a summary of files modified, npm publish config added, commit SHA pushed, and any remaining gaps.

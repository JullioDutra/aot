# Development workflow

- Work in the existing checkout. Cloud tasks are isolated; do not create a worktree unless the user asks for one.
- Read README.md and docs/ROADMAP.md. Preserve the Portuguese interface and clearly distinguish procedural prototypes from verified anime adaptations.
- User requirement: after each completed phase, validate it, commit it on a descriptive branch, push that branch, and open a GitHub pull request. Include the concrete behavior, validation results, and remaining limitations. Do not merge PRs or force-push without explicit authorization.
- When a phase depends on an unmerged phase, use a stacked branch and target that predecessor in its PR. Do not merge the predecessor just to create the next PR.
- If GitHub API access is blocked, still complete independent work and push through the existing Git proxy. Record the exact head/base and PR description, report the blocker and a comparison link, and never call a pushed branch an opened PR.
- Run `npm test`, `npm run test:browser`, and `npm run build` for gameplay changes. Browser tests use Chromium and software rendering; passing them is not a performance guarantee on real hardware.
- Never print credential values. Do not add official anime assets or music without rights/source confirmation.

# CLAUDE.md

**Working for the repo owner (Dhruv, `sirgreaseball`) on a fresh account or a new session?** Read `HANDOFF.md` first and follow it. It holds the history, the current state, the next tasks and how Dhruv works. The skills in `.claude/skills/` are part of that setup.

**Working for a teammate?** Read `AGENTS.md` first and follow it exactly. It lists which files each teammate may touch, the branch to use, and what never to do (edit app code, change dependencies, push to main, run database or deploy commands). `HANDOFF.md` does not apply to you.

Commands: `npm test` runs the rules engine and every scenario file; `npm run dbtest` checks the live database guarantees; `npm run race` checks the live database for double booking; the graph in `graphify-out/` maps the code (run `graphify update .` after code changes).

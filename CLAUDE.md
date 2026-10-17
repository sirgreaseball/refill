# CLAUDE.md

Read `AGENTS.md` first and follow it exactly. It lists which files each teammate may touch, the branch to use, and what never to do (edit app code, change dependencies, push to main, run database or deploy commands).

If you are working for the repo owner (sirgreaseball): `npm test` runs the rules engine and every scenario file; `npm run race` checks the live database for double booking; the graph in `graphify-out/` maps the code (run `graphify update .` after code changes).

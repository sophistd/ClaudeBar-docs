# Documentation contributor contract

- Read `CLAUDE.md` for the site map. Keep file contracts and module maps aligned.
- Treat `src/content/docs/` as the canonical text source; do not hand-edit generated Markdown.
- Distinguish implemented, verified, and planned behavior. Preserve prerequisites and side effects.
- Verify product claims against authorized source evidence; never publish internal reports or app source.
- Do not claim whole-device leak prevention, account safety, public downloads, or provider endorsement.
- Simulations must remain deterministic, labeled, and disconnected from the real machine.
- Keep the site static. Reuse Starlight navigation, search, syntax highlighting, tabs, and accessibility behavior.
- Preserve the repository base path. Run `npm run verify` and `npm run test:browser` before proposing release.
- Update the publication manifest and obtain explicit owner authorization before new public disclosure.
- Do not add credentials, local account/session data, signing material, or application binaries.

# Working rules

- Do the work first. Report only at the end, in the exact format the prompt asks for.
- Never answer with a summary of earlier work. If a prompt has numbered items, do each one.
- The prototype (design/prototype/caasm-console.html) is the reference for behavior, placement, text and states. Styling should match closely using the design tokens.
- Check the repo with git before claiming anything is done (git status, git log, git grep). Do not report something as done if the files are not there.
- One commit per item, with an honest message. Run vitest, playwright, typecheck, lint and build before each commit.
- Never push, force, reset or rewrite history unless asked.
- If something blocks you, say what blocked you in one line. Do not report it as done.
- Where design/CHANGES-SINCE-SPEC.md and design/BEHAVIOR.md disagree, CHANGES-SINCE-SPEC.md wins.

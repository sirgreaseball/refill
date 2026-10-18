# Team documents: source

Regenerate the two master documents:

```
cd docs/team/source
npm i docx@9          # once, into this folder
node btech.js && node mba.js
pwsh ./topdf.ps1      # Word fills the contents pages and exports the PDFs (Windows + Word)
```

Figures in `figs/` come from the film project (`video/`): `node tools/docfigs.mjs` renders the diagrams (`src/doc/Diagrams.tsx`) and frames from the film.

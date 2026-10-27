# Third-party notices

Windcraft's own code is proprietary (see `LICENSE`). This file covers third-party code that is **copied into
this repository** or **loaded by the pages**. Packages installed with npm keep their own licence files in `node_modules`;
`npm run licenses` checks that every production dependency has a permissive licence.

## Copied into the repository

### Preact 10.24.3 (MIT)
Bundled with htm in `packages/editor/vendor/preact-htm.js`.

```
The MIT License (MIT)

Copyright (c) 2015-present Jason Miller

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

### htm 3.1.1 (Apache-2.0)
Copyright 2018 Google Inc. Bundled with Preact in `packages/editor/vendor/preact-htm.js`. Licensed under the Apache License,
Version 2.0; the full text is at <https://www.apache.org/licenses/LICENSE-2.0> and in `node_modules/htm/LICENSE`.

## Loaded by the pages from a CDN (not copied here)

| Library | Licence | Loaded from |
| --- | --- | --- |
| Tailwind CSS (play CDN, v3) | MIT | cdn.tailwindcss.com |
| Quill 1.3.7 | BSD-3-Clause | cdnjs.cloudflare.com |
| AG Grid Community | MIT | cdn.jsdelivr.net |

## Rules for adding code

| | |
| --- | --- |
| Allowed | MIT, ISC, BSD, Apache-2.0, BlueOak-1.0.0, 0BSD, Unlicense, CC0 |
| Never | GPL, AGPL, LGPL (when bundled), SSPL, FSL, Commons Clause, or any "source-available" licence: they would limit how Windcraft can be licensed or sold |
| GPL tools (for example FigmaToCode) | Do not copy or adapt their code. Their ideas and the public Figma API docs are fine to build on, written from scratch |
| New copied code | Add its notice here in the same commit |

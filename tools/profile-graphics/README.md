# Profile graphics

Builds the light and dark graphics used by `profile/README.md`. Text is turned into vector paths with the
brand fonts (Space Grotesk and JetBrains Mono), because GitHub shows SVGs as images that cannot load web fonts.

```bash
npm install
node build.mjs ../../profile/assets preview "<path to the landing site's public/assets/og-image.png>"
```

Edit the copy near the top of each section in `build.mjs`, rebuild, and check the PNG renders in `preview/`.

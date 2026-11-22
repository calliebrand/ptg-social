# Fonts for server-side image rendering

Used by `lib/render.ts` to turn SVG into the 1080x1350 JPEGs Instagram publishes. These are the same families `scripts/posters.html` loads from Google Fonts.

All come from [google/fonts](https://github.com/google/fonts). Yellowtail is Apache 2.0; the rest are SIL Open Font License 1.1. Bodoni Moda Black (opsz 96, wght 900) and the two Playfair Display files are static instances cut from the variable fonts with `fonttools varLib.instancer`.

| File | `font-family` in SVG |
| --- | --- |
| BodoniModa-Black.ttf | Bodoni Moda |
| Anton-Regular.ttf | Anton |
| Yellowtail-Regular.ttf | Yellowtail |
| SpaceMono-Regular.ttf, SpaceMono-Bold.ttf | Space Mono |
| BebasNeue-Regular.ttf | Bebas Neue |
| PlayfairDisplay-Bold.ttf, PlayfairDisplay-BoldItalic.ttf | Playfair Display |
| OldStandard-Bold.ttf | Old Standard TT |
| UnifrakturMaguntia-Book.ttf | UnifrakturMaguntia |

# Liquid Glass integration for MAOMAO

This folder vendors the MIT-licensed **Liquid Glass for the Web v1.2.0** assets from:
https://github.com/IshiakiZ/liquid-glass-web

- `liquid-glass.css`
- `liquid-glass.js`
- `LICENSE`

MAOMAO scopes initialization to elements matching `.maomao-liquid-glass-icon` so the runtime only upgrades app-icon glass surfaces, not widgets or unrelated pages.

Browser note from the upstream project: Chromium 120+ can use the live-refraction tier. Safari and all browsers on iPhone/iPad use the frosted tier with live backdrop blur, highlights, shadow and motion, but without the live bend/refraction. The effect still samples the live wallpaper behind each icon tile.

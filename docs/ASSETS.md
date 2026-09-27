# Asset provenance

## Scene images

Source files live in `src/assets/images/` and are the only committed image data.

| File          | Pixels    | Bytes     | Scene                     |
| ------------- | --------- | --------- | ------------------------- |
| `hero.jpg`    | 2560×1440 | 361,438   | Opening: Lujiazui skyline |
| `bund.jpg`    | 2944×1664 | 451,446   | 01 The Bund               |
| `nanjing.jpg` | 2944×1664 | 822,326   | 02 Nanjing Road           |
| `pudong.jpg`  | 2944×1664 | 546,856   | 03 Lujiazui               |
| `alley.jpg`   | 2944×1664 | 257,659   | 04 Old City               |
| `garden.jpg`  | 2944×1664 | 1,101,302 | 05 Yu Garden              |
| `food.jpg`    | 1920×1072 | 203,142   | 06 Night Market           |
| `outro.jpg`   | 1920×1072 | 398,898   | Closing scene             |

**Known:** the images are AI-generated. The page says so ("cinematic imagery generated with AI")
and the project's first commit describes them as "hi-res AI imagery". They depict real places as
generated renderings, not photographs; signage and other text inside them is generated and does
not refer to real businesses.

**Not known:** the generator (model or service), prompts, generation dates, whether reference
photographs were used, and the usage terms that came with the images. The files carry no
provenance metadata: apart from three resolution tags they have no EXIF, XMP, IPTC, ICC or C2PA
data (checked 2026-09-27). The repository owner should record these details here if available.

## Generated derivatives

`build/images.ts` derives every served image at build time with Sharp; nothing it produces is
committed.

- Landscape: AVIF (quality 55) and WebP (quality 78) at 1280, 1920 and 2560 px plus the source
  width, JPEG (quality 80, progressive) at 1280 and 1920 px. Widths never exceed the source.
- Portrait: a centred 3:4 crop, full source height, in AVIF and WebP at 640 and 960 px plus the
  crop width. It is the same region `object-fit: cover` shows on tall screens.
- Social card: `og-image.jpg`, a 1200×630 centre crop of `hero.jpg`.
- Metadata is stripped; colour stays sRGB.

## Fonts

Self-hosted from npm and bundled into the build; only the Latin subsets are downloaded by
browsers for this page.

| Font          | Authors                           | License     | Package                              |
| ------------- | --------------------------------- | ----------- | ------------------------------------ |
| Space Grotesk | The Space Grotesk Project Authors | SIL OFL 1.1 | `@fontsource-variable/space-grotesk` |
| Inter         | The Inter Project Authors         | SIL OFL 1.1 | `@fontsource-variable/inter`         |

## Code and other assets

- [Lenis](https://github.com/darkroomengineering/lenis) (MIT, darkroom.engineering), bundled
  from npm.
- `public/favicon.svg`: hand-authored SVG with no external references.
- Ambient sound: synthesized at runtime with Web Audio oscillators and filtered noise; no audio
  files.

Each build writes the license texts of bundled components to `third-party-licenses.md`.

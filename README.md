# TrueThick | LogiQore Utility

TrueThick is a professional geological tool designed for structural orientation conversion and economic intercept analysis. Branded and optimized for **LogiQore**, this utility provides high-precision calculations for structural logging workflows.

## Key Features

- **Structural Orientation Solver**: Seamlessly convert between Kenometer (Alpha/Beta) measurements and geological orientations (Dip/Dip Direction).
- **Intercept Analysis**:
    - Calculate **True Thickness** using either structural data or direct Alpha angles.
    - Calculate **Gram-Meters** (metal accumulation) for mineralized intercepts.
- **Brand Integrated UI**: High-end LogiQore aesthetic with gold accents and glassmorphic design.
- **Zero Dependencies**: Pure HTML/CSS/JS — no server, no frameworks, no build step.
- **Data Export**: CSV report export (planned).

## Conventions

Frame x = East, y = North, z = Up. All angles in degrees.

| Quantity | Convention |
|---|---|
| Hole azimuth / dip | Azimuth clockwise from North; dip negative downward (−90 = vertical down) |
| Plane | Dip 0–90 toward dip direction 0–360; strike = dip direction − 90 (right-hand rule) |
| Alpha | Kenometer alpha: acute angle between the core axis and the **plane** (90 = plane perpendicular to the core) |
| Beta | Clockwise looking downhole, from the **bottom-of-hole** line to the downhole-most point of the ellipse, 0–360 |
| True thickness | Downhole length × sin(alpha); gram-metres = grade × true thickness |

Undefined values are shown as "—": beta in a vertical hole or when alpha = 90°, and dip direction for a horizontal plane (or from alpha/beta in a vertical hole). At alpha = 0°, beta and beta + 180° describe the same plane.

## Files

| File | Purpose |
|---|---|
| `index.html` | Page markup and styles |
| `geo.js` | Geometry engine (ES module, no DOM), importable by other projects |
| `app.js` | UI logic (ES module), imports `geo.js` |
| `test/geo.test.js` | `node:test` suite: known answers and round-trip property tests |

## Tests

Requires Node 20+; no packages to install.

```bash
npm test
```

CI runs the same command on every pull request (`.github/workflows/test.yml`).

## Usage

### Open directly

Serve the folder from any static host (see *Run locally* below). Opening `index.html` straight from disk (`file://`) does not work in most browsers, because they block JavaScript modules on `file://` pages; the page shows a notice if that happens.

### Embed on LogiQore.io

LogiQore.io vendors a copy under `public/truethick/`; copy `index.html`, `geo.js` and `app.js` together. To embed the GitHub Pages copy instead:

```html
<iframe src="https://jhizzing.github.io/TrueThick/"
        width="100%" height="800" frameborder="0"
        style="border-radius: 16px;">
</iframe>
```

### Deploy via GitHub Pages

1. Push this repository to **GitHub**.
2. Go to **Settings → Pages** and set the source to the `main` branch.
3. Your app is live at `https://<username>.github.io/TrueThick/`.

### Run locally

Any static file server works:

```bash
# Python
python3 -m http.server 8000

# Node
npx serve .
```

Then open `http://localhost:8000`.

---
*Developed for LogiQore. Modern Structural Orientation & True Thickness Analysis.*

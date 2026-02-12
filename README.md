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

## Usage

### Open directly

Double-click `index.html` or serve it from any static host. No installation required.

### Embed on LogiQore.io

Add a single iframe tag to your website:

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

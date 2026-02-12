# TrueThick | LogiQore Utility

TrueThick is a professional geological tool designed for structural orientation conversion and economic intercept analysis. Branded and optimized for **LogiQore**, this utility provides high-precision calculations for structural logging workflows.

## Key Features

- **Structural Orientation Solver**: Seamlessly convert between Kenometer (Alpha/Beta) measurements and geological orientations (Dip/Dip Direction).
- **Intercept Analysis**: 
    - Calculate **True Thickness** using either structural data or direct Alpha angles.
    - Calculate **Gram-Meters** (metal accumulation) for mineralized intercepts.
- **Brand Integrated UI**: High-end LogiQore aesthetic with gold accents and glassmorphic design.
- **Data Export**: CSV report export (planned).

## Installation

To run the application locally:

1. **Clone the repository**:
   ```bash
   git clone <your-repo-url>
   cd TrueThick
   ```

2. **Set up the environment**:
   ```bash
   python -m venv venv
   source venv/bin/activate  # Mac/Linux
   # or venv\Scripts\activate  # Windows
   pip install -r requirements.txt
   ```

3. **Launch the app**:
   ```bash
   streamlit run app.py
   ```

## Deployment on LogiQore.io

To host this on your website:

### Option 1: Streamlit Community Cloud (Recommended)
1. Push this repository to **GitHub**.
2. Connect your GitHub account to [Streamlit Cloud](https://share.streamlit.io/).
3. Deploy the `app.py` file. It will give you a public URL.
4. On `logiqore.io`, you can link to this URL or embed it via an `iframe`.

### Option 2: Standalone Download
If you wish to provide a "Download" link for users to run it locally:
1. Provide a link to the GitHub repository.
2. Or use [Stlite](https://stlite.net/) to bundle it into a static HTML file that runs entirely in the browser without a backend server.

---
*Developed for LogiQore. Modern Structural Orientation & True Thickness Analysis.*

# Security Review — TrueThick v2.0

**Date:** 2026-02-12
**Scope:** Full codebase review (`app.py`, `geometry.py`, `requirements.txt`, configuration files)
**Reviewer:** Automated Security Analysis

---

## Executive Summary

TrueThick is a lightweight Streamlit web application for geological structural orientation conversion and intercept analysis. The codebase is small (~490 LOC across 2 Python files) with minimal dependencies (`streamlit`, `numpy`). There is no authentication, no database, no file I/O, and no sensitive data handling — the attack surface is correspondingly small.

**11 findings** were identified: **0 High**, **3 Medium**, **5 Low**, **3 Informational**.

No critical or high-severity vulnerabilities were found. The medium-severity findings relate to supply chain risk from unpinned dependencies, a pattern of `unsafe_allow_html` usage that could become dangerous as the codebase evolves, and exception information leakage.

---

## Findings

### MEDIUM

#### M1 — Unpinned Dependencies (Supply Chain Risk)

| Field | Detail |
|-------|--------|
| **File** | `requirements.txt:1-2` |
| **CWE** | CWE-1104 (Use of Unmaintained Third-Party Components) |

**Description:**
Both `streamlit` and `numpy` are listed without version constraints. A `pip install -r requirements.txt` will pull the latest version available at install time.

**Risk:**
- A compromised or malicious package release could be installed without notice.
- A breaking API change could silently break the app in production.
- No reproducibility — different installs may produce different behavior.

**Recommendation:**
Pin dependencies to specific versions or use version ranges:

```
streamlit>=1.41.0,<2.0.0
numpy>=1.26.0,<2.0.0
```

Or use a lockfile (`pip freeze > requirements.lock`).

---

#### M2 — Repeated Use of `unsafe_allow_html=True`

| Field | Detail |
|-------|--------|
| **File** | `app.py:135, 145, 146, 160, 230, 312` |
| **CWE** | CWE-79 (Cross-Site Scripting) |

**Description:**
`st.markdown(..., unsafe_allow_html=True)` is called 6 times throughout the application. Currently all HTML content is hardcoded string literals — no user input is interpolated.

**Risk:**
No **current** XSS vulnerability exists. However, this pattern is dangerous because:
- If any future developer interpolates user-controlled data into these markdown calls (e.g., via f-strings), it creates a stored XSS vector.
- The `unsafe_allow_html` flag name itself signals that Streamlit considers this a security opt-out.

**Recommendation:**
- Minimize use of `unsafe_allow_html=True`. Use Streamlit's native theming and component APIs where possible.
- If raw HTML is necessary, add code comments warning against interpolating user input.
- Consider moving custom CSS into a `.streamlit/config.toml` theme or a static CSS file.

---

#### M3 — Raw Exception Messages Exposed to Users

| Field | Detail |
|-------|--------|
| **File** | `app.py:222-223, 304-305` |
| **CWE** | CWE-209 (Information Exposure Through Error Messages) |

**Description:**
Both calculation tabs catch broad `Exception` and display the raw message to the user:

```python
except Exception as e:
    st.error(f"Calculation error: {e}")
```

**Risk:**
Python exception messages can contain:
- Internal file paths and module structure
- Library version information
- Function signatures and variable names

This information aids attackers in reconnaissance for more targeted attacks.

**Recommendation:**
Display a generic user-friendly message and log the full exception server-side:

```python
import logging
logger = logging.getLogger(__name__)

except Exception as e:
    logger.exception("Calculation failed")
    st.error("A calculation error occurred. Please check your inputs and try again.")
```

---

### LOW

#### L1 — External Resource Loading Without Integrity Verification

| Field | Detail |
|-------|--------|
| **File** | `app.py:29, 142` |
| **CWE** | CWE-829 (Inclusion of Functionality from Untrusted Control Sphere) |

**Description:**
- Google Fonts CSS is imported from `fonts.googleapis.com` (line 29).
- An external logo image is loaded from `https://logiqore.io/logo.png` (line 142).

**Risk:**
If either external domain is compromised, DNS-hijacked, or experiences a supply-chain attack, malicious CSS or image content could be served to users. No Subresource Integrity (SRI) hashes are in place.

**Recommendation:**
- Self-host the font files and logo image as static assets.
- If external loading is required, add SRI hashes where the framework supports it.
- Ensure the application degrades gracefully if external resources are unavailable.

---

#### L2 — No Content Security Policy (CSP) Headers

| Field | Detail |
|-------|--------|
| **File** | N/A (deployment configuration) |
| **CWE** | CWE-1021 (Improper Restriction of Rendered UI Layers) |

**Description:**
No Content Security Policy headers are configured. Streamlit does not provide a built-in CSP mechanism.

**Recommendation:**
When deploying behind a reverse proxy (nginx, Cloudflare, etc.), configure CSP headers to restrict script sources, style sources, and image sources to trusted origins only.

---

#### L3 — Potential Division-by-Zero in Geometry Functions

| Field | Detail |
|-------|--------|
| **File** | `geometry.py:28, 48, 75, 79, 122, 131, 134, 142` |
| **CWE** | CWE-369 (Divide By Zero) |

**Description:**
Multiple vector normalization operations divide by `np.linalg.norm(v)`. Edge-case inputs (e.g., zero vectors, degenerate plane normals, or parallel vectors in cross products) can produce zero-length vectors, leading to division-by-zero or `NaN` propagation.

While Streamlit number input widgets constrain value ranges on the client side, `geometry.py` is a standalone module that could be imported and called programmatically without those constraints.

**Recommendation:**
Add guard checks before normalization:

```python
norm = np.linalg.norm(v)
if norm < 1e-10:
    raise ValueError("Degenerate input: zero-length vector")
v = v / norm
```

---

#### L4 — No Python Version Specification

| Field | Detail |
|-------|--------|
| **File** | N/A (missing `runtime.txt` / `.python-version`) |

**Description:**
No file specifies the required Python version. The app could be run on unsupported or end-of-life Python versions with known security vulnerabilities.

**Recommendation:**
Add a `runtime.txt` (for Streamlit Cloud) or `.python-version` file specifying `python-3.11` or later.

---

#### L5 — Missing Streamlit Security Configuration

| Field | Detail |
|-------|--------|
| **File** | `.streamlit/config.toml` (absent, gitignored) |

**Description:**
Streamlit supports XSRF protection (`server.enableXsrfProtection`) and CORS configuration (`server.enableCORS`) via its config file. No config file is present, and it is explicitly gitignored.

**Recommendation:**
Create a `.streamlit/config.toml` with explicit security settings and track it in version control:

```toml
[server]
enableXsrfProtection = true
enableCORS = false
```

---

### INFORMATIONAL

#### I1 — No Authentication or Access Control

The application is fully open — anyone with the URL can use it. This is acceptable for a public calculation tool with no sensitive data, but should be documented as an intentional design decision. If the app is ever deployed in an environment with sensitive geological data, access control (e.g., Streamlit Cloud's built-in auth, or an external auth proxy) should be added.

#### I2 — README Advertises Unimplemented CSV Export

The README states: *"Data Export: Export your session results directly to professional CSV reports."* No export functionality exists in the codebase. If CSV export is implemented in the future, it must include sanitization to prevent CSV injection attacks (e.g., stripping leading `=`, `+`, `-`, `@` characters from cell values).

#### I3 — Git Remote Uses HTTP

The `.git/config` remote URL uses `http://` (pointing to a local proxy at `127.0.0.1:52917`). This is acceptable for local development but credentials and data would be transmitted in cleartext if used over a network. Use HTTPS or SSH for any non-local remotes.

---

## Summary Table

| ID | Severity | Title | File(s) |
|----|----------|-------|---------|
| M1 | Medium | Unpinned Dependencies | `requirements.txt` |
| M2 | Medium | `unsafe_allow_html=True` Pattern | `app.py` |
| M3 | Medium | Exception Information Leakage | `app.py` |
| L1 | Low | External Resources Without SRI | `app.py` |
| L2 | Low | No CSP Headers | Deployment config |
| L3 | Low | Potential Division-by-Zero | `geometry.py` |
| L4 | Low | No Python Version Specified | Missing file |
| L5 | Low | Missing Streamlit Security Config | `.streamlit/config.toml` |
| I1 | Info | No Authentication | Design decision |
| I2 | Info | Unimplemented CSV Export in README | `README.md` |
| I3 | Info | Git Remote Uses HTTP | `.git/config` |

---

## Conclusion

The TrueThick application has a small attack surface due to its simplicity — no auth, no database, no file I/O, and purely computational logic. No critical or high-severity vulnerabilities were found. The most actionable items are:

1. **Pin dependency versions** to mitigate supply chain risk.
2. **Sanitize error output** to prevent information leakage.
3. **Minimize `unsafe_allow_html`** usage and add guardrails against future XSS.
4. **Add zero-vector guards** in geometry functions to prevent crashes on edge-case inputs.

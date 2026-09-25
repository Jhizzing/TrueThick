import * as Geo from "./geo.js";

document.documentElement.classList.add("js-ready");

// --- Tab switching ---
const tabBtns = document.querySelectorAll(".tab-btn");
const tabPanels = document.querySelectorAll(".tab-panel");

tabBtns.forEach(btn => {
    btn.addEventListener("click", () => {
        tabBtns.forEach(b => b.classList.remove("active"));
        tabPanels.forEach(p => p.classList.remove("active"));
        btn.classList.add("active");
        document.getElementById("tab-" + btn.dataset.tab).classList.add("active");
    });
});

// --- Tab 1: Mode toggle ---
const modeRadios = document.querySelectorAll('input[name="orient-mode"]');
const abInputs = document.getElementById("ab-inputs");
const ddInputs = document.getElementById("dd-inputs");

modeRadios.forEach(r => {
    r.addEventListener("change", () => {
        const isAB = r.value === "alpha_beta";
        abInputs.style.display = isAB ? "block" : "none";
        ddInputs.style.display = isAB ? "none" : "block";
        document.getElementById("orient-results").classList.remove("visible");
    });
});

// --- Tab 2: Method toggle ---
const methodRadios = document.querySelectorAll('input[name="intercept-method"]');
const structInputs = document.getElementById("struct-inputs");
const alphaInput = document.getElementById("alpha-input");

methodRadios.forEach(r => {
    r.addEventListener("change", () => {
        const isStruct = r.value === "structural";
        structInputs.style.display = isStruct ? "block" : "none";
        alphaInput.style.display = isStruct ? "none" : "block";
        document.getElementById("intercept-results").classList.remove("visible");
    });
});

// --- Helper: read and validate number input against its min/max ---
class InputError extends Error {}

function val(id, { positive = false } = {}) {
    const el = document.getElementById(id);
    const label = document.querySelector(`label[for="${id}"]`).textContent;
    const v = parseFloat(el.value);
    let msg = null;
    if (!Number.isFinite(v)) msg = `${label} is required and must be a number.`;
    else if (v < parseFloat(el.min) || v > parseFloat(el.max)) msg = `${label} must be between ${el.min} and ${el.max}.`;
    else if (positive && v <= 0) msg = `${label} must be greater than 0.`;
    if (msg) {
        el.setAttribute("aria-invalid", "true");
        el.focus();
        throw new InputError(msg);
    }
    return v;
}

function clearInvalid(panel) {
    panel.querySelectorAll('[aria-invalid="true"]').forEach(el => el.removeAttribute("aria-invalid"));
}

function showAlert(container, kind, text) {
    const div = document.createElement("div");
    div.className = "alert alert-" + kind;
    div.setAttribute("role", kind === "error" ? "alert" : "status");
    div.textContent = text;
    container.appendChild(div);
}

function showError(container, err) {
    showAlert(container, "error", err instanceof InputError
        ? err.message
        : "A calculation error occurred. Please check your inputs and try again.");
}

const deg = v => v === null ? "—" : v.toFixed(1) + "°";

// --- Helper: render metric ---
function metricHTML(label, value) {
    return `<div class="metric"><div class="metric-value">${value}</div><div class="metric-label">${label}</div></div>`;
}

// --- Tab 1: Solve Orientation ---
document.getElementById("btn-solve").addEventListener("click", () => {
    const results = document.getElementById("orient-results");
    const metricsEl = document.getElementById("orient-metrics");
    const errorEl = document.getElementById("orient-error");
    const titleEl = document.getElementById("orient-results-title");

    errorEl.innerHTML = "";
    metricsEl.innerHTML = "";
    clearInvalid(document.getElementById("tab-orientation"));

    const mode = document.querySelector('input[name="orient-mode"]:checked').value;

    try {
        const holeAz = val("t1-hole-az");
        const holeDip = val("t1-hole-dip");
        const vertical = Geo.bottomOfHole(Geo.holeVector(holeAz, holeDip)) === null;
        if (mode === "alpha_beta") {
            const alpha = val("t1-alpha");
            const beta = val("t1-beta");
            const r = Geo.alphaBetaToDipDipdir(holeAz, holeDip, alpha, beta);

            titleEl.textContent = "Final Orientation";
            metricsEl.innerHTML =
                metricHTML("Dip", deg(r.dip)) +
                metricHTML("Dip Direction", deg(r.dipdir)) +
                metricHTML("Strike", deg(r.strike));
            if (r.dipdir === null) {
                showAlert(errorEl, "info", vertical && alpha < 90
                    ? "Vertical hole: beta has no bottom-of-hole reference, so only dip can be recovered."
                    : "Horizontal plane: dip direction and strike are undefined.");
            }
        } else {
            const structDip = val("t1-dip");
            const structDipdir = val("t1-dipdir");
            const r = Geo.dipDipdirToAlphaBeta(holeAz, holeDip, structDip, structDipdir);

            titleEl.textContent = "Kenometer Geometry";
            metricsEl.innerHTML =
                metricHTML("Alpha", deg(r.alpha)) +
                metricHTML("Beta", deg(r.beta));
            if (r.beta === null) {
                showAlert(errorEl, "info", vertical
                    ? "Vertical hole: beta is undefined because there is no bottom-of-hole line."
                    : "Alpha is 90°: the plane is perpendicular to the core, so its trace is a circle and beta is undefined.");
            } else if (r.alpha < 0.05) {
                showAlert(errorEl, "info", "Alpha is 0°: the plane is parallel to the core, so beta and beta + 180° describe the same plane.");
            }
        }
        results.classList.add("visible");
    } catch (err) {
        showError(errorEl, err);
        results.classList.add("visible");
    }
});

// --- Tab 2: Analyze Intercept ---
document.getElementById("btn-analyze").addEventListener("click", () => {
    const results = document.getElementById("intercept-results");
    const metricsEl = document.getElementById("intercept-metrics");
    const interpEl = document.getElementById("intercept-interpretation");
    const errorEl = document.getElementById("intercept-error");

    metricsEl.innerHTML = "";
    interpEl.innerHTML = "";
    errorEl.innerHTML = "";
    clearInvalid(document.getElementById("tab-intercept"));

    const method = document.querySelector('input[name="intercept-method"]:checked').value;

    try {
        const holeAz = val("t2-hole-az");
        const holeDip = val("t2-hole-dip");
        const interval = val("t2-length", { positive: true });
        const grade = val("t2-grade");

        let aVal;
        if (method === "structural") {
            const structDip = val("t2-dip");
            const structDipdir = val("t2-dipdir");
            aVal = Geo.dipDipdirToAlphaBeta(holeAz, holeDip, structDip, structDipdir).alpha;
        } else {
            aVal = val("t2-alpha");
        }

        const tt = Geo.trueThicknessFromAlpha(interval, aVal);
        const gm = Geo.calculateGramMeters(grade, tt);

        metricsEl.innerHTML =
            metricHTML("True Thickness", tt.toFixed(2) + " m") +
            metricHTML("Gram-Meters", gm.toFixed(1)) +
            metricHTML("Intersection Alpha", aVal.toFixed(1) + "°");

        if (aVal > 70) {
            interpEl.innerHTML = '<div class="alert alert-info">🎯 <strong>High-angle intersection:</strong> Near-perpendicular cut. Thickness is reliable.</div>';
        } else if (aVal > 40) {
            interpEl.innerHTML = '<div class="alert alert-info">✅ <strong>Moderate-angle intersection:</strong> Reasonable cut.</div>';
        } else {
            interpEl.innerHTML = '<div class="alert alert-warning">⚠️ <strong>Low-angle intersection:</strong> Shallow cut. Likely apparent thickness inflation.</div>';
        }

        results.classList.add("visible");
    } catch (err) {
        showError(errorEl, err);
        results.classList.add("visible");
    }
});

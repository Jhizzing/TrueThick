// TrueThick geometry engine. Pure functions, no DOM; imported by app.js and the tests.
//
// Frame: x = East, y = North, z = Up. Angles are in degrees at the API boundary.
//
// Conventions:
//   Hole        azimuth clockwise from North; dip negative downward (-90 = vertical down).
//               holeVector() points downhole.
//   Plane       dip 0-90, dip direction 0-360 clockwise from North; strike = dip direction - 90
//               (right-hand rule). planeNormal() is the upward pole.
//   Alpha       kenometer alpha: acute angle between the core axis and the PLANE
//               (90 = plane perpendicular to the core, 0 = plane parallel to the core).
//   Beta        measured clockwise, looking downhole, from the bottom-of-hole (BOH) line to the
//               downhole-most point of the ellipse the plane traces on the core, 0-360.
//
// Undefined cases return null rather than a number:
//   beta is undefined for a vertical hole (no bottom-of-hole line) and when alpha = 90
//   (the ellipse is a circle); dip direction is undefined for a horizontal plane and cannot be
//   recovered from alpha/beta in a vertical hole.

const DEG = Math.PI / 180;
const EPS = 1e-10;

const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const scale = (v, s) => [v[0] * s, v[1] * s, v[2] * s];
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const length = v => Math.hypot(v[0], v[1], v[2]);
const unit = v => scale(v, 1 / length(v));
const wrap360 = d => ((d % 360) + 360) % 360;
const clamp1 = x => Math.max(-1, Math.min(1, x));

function requireFinite(values) {
    for (const [name, v] of Object.entries(values)) {
        if (!Number.isFinite(v)) throw new RangeError(`${name} must be a finite number.`);
    }
}

function requireAlpha(alphaDeg) {
    requireFinite({ alphaDeg });
    if (alphaDeg < 0 || alphaDeg > 90) throw new RangeError("alpha must be between 0 and 90.");
}

export function holeVector(azimuthDeg, dipDeg) {
    requireFinite({ azimuthDeg, dipDeg });
    const az = azimuthDeg * DEG, dp = dipDeg * DEG;
    return [Math.sin(az) * Math.cos(dp), Math.cos(az) * Math.cos(dp), Math.sin(dp)];
}

export function planeNormalFromDipDipdir(dipDeg, dipdirDeg) {
    requireFinite({ dipDeg, dipdirDeg });
    const dip = dipDeg * DEG, dd = dipdirDeg * DEG;
    return [Math.sin(dip) * Math.sin(dd), Math.sin(dip) * Math.cos(dd), Math.cos(dip)];
}

// Unit vector perpendicular to the hole, pointing as far down as possible; null for a vertical hole.
export function bottomOfHole(holeVec) {
    const v = sub(scale(holeVec, holeVec[2]), [0, 0, 1]);
    return length(v) < EPS ? null : unit(v);
}

// Angle between the core axis and the plane normal (0-90).
export function alphaNormal(holeVec, planeNormal) {
    return Math.acos(clamp1(Math.abs(dot(holeVec, planeNormal)))) / DEG;
}

export function alphaKenometer(alphaNormalDeg) {
    return Math.min(90, Math.max(0, 90 - alphaNormalDeg));
}

export function betaAngle(holeVec, planeNormal) {
    const boh = bottomOfHole(holeVec);
    const d = dot(holeVec, planeNormal);
    const perp = sub(planeNormal, scale(holeVec, d));
    if (!boh || length(perp) < EPS) return null;
    const lowest = scale(unit(perp), d > 0 ? -1 : 1);
    const beta = wrap360(Math.atan2(dot(cross(boh, lowest), holeVec), dot(boh, lowest)) / DEG);
    // At alpha = 0 the trace is two lines along the core: beta and beta + 180 are the same plane.
    return Math.abs(d) < EPS ? beta % 180 : beta;
}

export function dipDipdirToAlphaBeta(holeAz, holeDip, dip, dipdir) {
    const h = holeVector(holeAz, holeDip);
    const n = planeNormalFromDipDipdir(dip, dipdir);
    return { alpha: alphaKenometer(alphaNormal(h, n)), beta: betaAngle(h, n) };
}

// Returns the upward pole, or null when beta is needed but the hole is vertical.
// Beta is ignored (and may be null) when alpha = 90.
export function alphaBetaToPlaneNormal(holeAz, holeDip, alphaDeg, betaDeg) {
    requireAlpha(alphaDeg);
    const h = holeVector(holeAz, holeDip);
    let n;
    if (90 - alphaDeg < EPS) {
        n = h;
    } else {
        requireFinite({ betaDeg });
        const boh = bottomOfHole(h);
        if (!boh) return null;
        const a = alphaDeg * DEG, b = betaDeg * DEG;
        const lowest = add(scale(boh, Math.cos(b)), scale(cross(h, boh), Math.sin(b)));
        n = sub(scale(h, Math.sin(a)), scale(lowest, Math.cos(a)));
    }
    return unit(n[2] < 0 ? scale(n, -1) : n);
}

export function normalToDipDipdir(n) {
    const up = unit(n[2] < 0 ? scale(n, -1) : n);
    const dip = Math.acos(clamp1(up[2])) / DEG;
    if (Math.hypot(up[0], up[1]) < EPS) return { dip: 0, dipdir: null };
    return { dip, dipdir: wrap360(Math.atan2(up[0], up[1]) / DEG) };
}

// For a vertical hole, dip is still 90 - alpha but dip direction is unknowable (dipdir: null).
export function alphaBetaToDipDipdir(holeAz, holeDip, alpha, beta) {
    const n = alphaBetaToPlaneNormal(holeAz, holeDip, alpha, beta);
    const { dip, dipdir } = n ? normalToDipDipdir(n) : { dip: 90 - alpha, dipdir: null };
    return { dip, dipdir, strike: dipdir === null ? null : wrap360(dipdir - 90) };
}

export function trueThicknessFromAlpha(downholeLength, alphaKenoDeg) {
    requireFinite({ downholeLength });
    requireAlpha(alphaKenoDeg);
    if (downholeLength < 0) throw new RangeError("downholeLength must not be negative.");
    return downholeLength * Math.sin(alphaKenoDeg * DEG);
}

export function calculateGramMeters(grade, trueThickness) {
    requireFinite({ grade, trueThickness });
    return grade * trueThickness;
}

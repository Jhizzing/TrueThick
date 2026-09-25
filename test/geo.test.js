import { test, describe } from "node:test";
import assert from "node:assert/strict";
import * as Geo from "../geo.js";

const DEG = Math.PI / 180;

function near(actual, expected, tol, msg) {
    assert.ok(Math.abs(actual - expected) <= tol, `${msg ?? ""} expected ${expected} ± ${tol}, got ${actual}`);
}

function angleDiff(a, b) {
    const d = Math.abs(a - b) % 360;
    return Math.min(d, 360 - d);
}

function nearAngle(actual, expected, tol, msg) {
    assert.ok(angleDiff(actual, expected) <= tol, `${msg ?? ""} expected ${expected} ± ${tol} (mod 360), got ${actual}`);
}

// Two dip/dipdir pairs describe the same plane if their upward poles coincide.
function samePlane(a, b, tol = 1e-7) {
    const na = Geo.planeNormalFromDipDipdir(a.dip, a.dipdir ?? 0);
    const nb = Geo.planeNormalFromDipDipdir(b.dip, b.dipdir ?? 0);
    const d = Math.abs(na[0] * nb[0] + na[1] * nb[1] + na[2] * nb[2]);
    return Math.acos(Math.min(1, d)) / DEG <= tol;
}

// Deterministic PRNG so property-test failures are reproducible.
function mulberry32(seed) {
    return () => {
        seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function randomCases(n, seed) {
    const rnd = mulberry32(seed);
    return Array.from({ length: n }, () => ({
        az: rnd() * 360,
        holeDip: -(0.5 + rnd() * 89),
        dip: 0.5 + rnd() * 89,
        dipdir: rnd() * 360,
    }));
}

describe("known answers", () => {
    test("UI default: hole 240/-60, plane 45->135, 10 m @ 5 g/t", () => {
        const { alpha, beta } = Geo.dipDipdirToAlphaBeta(240, -60, 45, 135);
        near(alpha, 44.739, 0.001, "alpha");
        near(beta, 105.939, 0.001, "beta");
        const tt = Geo.trueThicknessFromAlpha(10, alpha);
        assert.equal(tt.toFixed(2), "7.04");
        assert.equal(Geo.calculateGramMeters(5, tt).toFixed(1), "35.2");
    });

    test("UI default kenometer: hole 240/-60, alpha 60, beta 30 -> 57.8 / 077.2", () => {
        const r = Geo.alphaBetaToDipDipdir(240, -60, 60, 30);
        near(r.dip, 57.758, 0.001, "dip");
        near(r.dipdir, 77.192, 0.001, "dipdir");
        near(r.strike, 347.192, 0.001, "strike");
    });

    test("hole perpendicular to plane: alpha 90, TT = length, beta undefined", () => {
        const { alpha, beta } = Geo.dipDipdirToAlphaBeta(240, -60, 30, 60);
        near(alpha, 90, 1e-9);
        assert.equal(beta, null);
        near(Geo.trueThicknessFromAlpha(10, alpha), 10, 1e-9);
    });

    test("alpha 90 recovers the plane perpendicular to the hole for any beta", () => {
        for (const beta of [0, 123, 359, null]) {
            const r = Geo.alphaBetaToDipDipdir(240, -60, 90, beta);
            near(r.dip, 30, 1e-9, `dip (beta ${beta})`);
            near(r.dipdir, 60, 1e-9, `dipdir (beta ${beta})`);
        }
    });

    test("hole 000/-45 and plane 45->180 are perpendicular (hand-derived)", () => {
        near(Geo.dipDipdirToAlphaBeta(0, -45, 45, 180).alpha, 90, 1e-9);
    });

    test("hole lying in the plane gives alpha 0 and TT 0", () => {
        const { alpha } = Geo.dipDipdirToAlphaBeta(90, -60, 60, 90);
        near(alpha, 0, 1e-9);
        near(Geo.trueThicknessFromAlpha(10, alpha), 0, 1e-9);
    });

    test("beta is clockwise looking downhole: west-dipping plane in a north hole", () => {
        // Hole 000/-45 looks north: clockwise from bottom-of-hole is towards the west wall.
        // Plane 45->270: pole (-1,0,1)/sqrt2; lowest ellipse point (-2,1,1)/sqrt6, which gives
        // beta = 180 - atan(sqrt 2) and alpha = asin(1/2).
        const west = Geo.dipDipdirToAlphaBeta(0, -45, 45, 270);
        near(west.alpha, 30, 1e-9, "alpha");
        near(west.beta, 180 - Math.atan(Math.SQRT2) / DEG, 1e-9, "beta");
        const east = Geo.dipDipdirToAlphaBeta(0, -45, 45, 90);
        near(east.beta, 180 + Math.atan(Math.SQRT2) / DEG, 1e-9, "mirror beta");
    });

    test("plane rising in the hole direction puts the lowest point on top of hole (beta 180)", () => {
        const { alpha, beta } = Geo.dipDipdirToAlphaBeta(0, -45, 20, 180);
        near(alpha, 65, 1e-9);
        near(beta, 180, 1e-9);
    });

    test("horizontal plane: alpha = |hole dip|, beta 180, and back to dip 0 with no dip direction", () => {
        const { alpha, beta } = Geo.dipDipdirToAlphaBeta(240, -60, 0, 0);
        near(alpha, 60, 1e-9);
        near(beta, 180, 1e-9);
        const back = Geo.alphaBetaToDipDipdir(240, -60, alpha, beta);
        near(back.dip, 0, 1e-9);
        assert.equal(back.dipdir, null);
        assert.equal(back.strike, null);
    });

    test("vertical hole: alpha defined, beta undefined, dip recoverable but not dip direction", () => {
        const { alpha, beta } = Geo.dipDipdirToAlphaBeta(0, -90, 45, 200);
        near(alpha, 45, 1e-9);
        assert.equal(beta, null);
        const r = Geo.alphaBetaToDipDipdir(0, -90, 45, 10);
        near(r.dip, 45, 1e-9);
        assert.equal(r.dipdir, null);
    });

    test("alpha 0: beta is reported in [0, 180) since beta and beta + 180 are the same plane", () => {
        const { alpha, beta } = Geo.dipDipdirToAlphaBeta(0, -45, 45, 0);
        near(alpha, 0, 1e-9);
        assert.ok(beta >= 0 && beta < 180, `beta ${beta}`);
        const back0 = Geo.alphaBetaToDipDipdir(0, -45, 0, beta);
        const back180 = Geo.alphaBetaToDipDipdir(0, -45, 0, beta + 180);
        assert.ok(samePlane(back0, { dip: 45, dipdir: 0 }) && samePlane(back180, { dip: 45, dipdir: 0 }));
    });

    test("direct alpha 60: TT 8.66 m, GM 43.3", () => {
        const tt = Geo.trueThicknessFromAlpha(10, 60);
        assert.equal(tt.toFixed(2), "8.66");
        assert.equal(Geo.calculateGramMeters(5, tt).toFixed(1), "43.3");
    });

    test("normals pointing down are flipped up before reading dip direction", () => {
        const r = Geo.normalToDipDipdir(Geo.planeNormalFromDipDipdir(30, 60).map(x => -x));
        near(r.dip, 30, 1e-9);
        near(r.dipdir, 60, 1e-9);
    });
});

describe("invalid input", () => {
    test("NaN and out-of-range values throw RangeError", () => {
        assert.throws(() => Geo.dipDipdirToAlphaBeta(NaN, -60, 45, 135), RangeError);
        assert.throws(() => Geo.alphaBetaToDipDipdir(240, -60, 120, 30), RangeError);
        assert.throws(() => Geo.alphaBetaToDipDipdir(240, -60, 60, NaN), RangeError);
        assert.throws(() => Geo.trueThicknessFromAlpha(10, 120), RangeError);
        assert.throws(() => Geo.trueThicknessFromAlpha(-10, 60), RangeError);
        assert.throws(() => Geo.calculateGramMeters(NaN, 5), RangeError);
    });
});

describe("properties over random holes and planes", () => {
    const cases = randomCases(5000, 20260925);

    test("alpha is the angle between core axis and plane, in [0, 90]; beta in [0, 360)", () => {
        for (const c of cases) {
            const { alpha, beta } = Geo.dipDipdirToAlphaBeta(c.az, c.holeDip, c.dip, c.dipdir);
            const h = Geo.holeVector(c.az, c.holeDip), n = Geo.planeNormalFromDipDipdir(c.dip, c.dipdir);
            near(alpha, Math.asin(Math.abs(h[0] * n[0] + h[1] * n[1] + h[2] * n[2])) / DEG, 1e-9);
            assert.ok(alpha >= 0 && alpha <= 90);
            assert.ok(beta >= 0 && beta < 360, `beta ${beta}`);
        }
    });

    test("dip/dipdir -> alpha/beta -> dip/dipdir round-trips", () => {
        for (const c of cases) {
            const { alpha, beta } = Geo.dipDipdirToAlphaBeta(c.az, c.holeDip, c.dip, c.dipdir);
            const back = Geo.alphaBetaToDipDipdir(c.az, c.holeDip, alpha, beta);
            near(back.dip, c.dip, 1e-7, `dip ${JSON.stringify(c)}`);
            nearAngle(back.dipdir, c.dipdir, 1e-6, `dipdir ${JSON.stringify(c)}`);
        }
    });

    test("alpha/beta -> dip/dipdir -> alpha/beta round-trips", () => {
        const rnd = mulberry32(7);
        for (const c of cases) {
            const alpha = 0.5 + rnd() * 89, beta = rnd() * 360;
            const pl = Geo.alphaBetaToDipDipdir(c.az, c.holeDip, alpha, beta);
            const back = Geo.dipDipdirToAlphaBeta(c.az, c.holeDip, pl.dip, pl.dipdir);
            near(back.alpha, alpha, 1e-7, `alpha ${JSON.stringify(c)}`);
            nearAngle(back.beta, beta, 1e-6, `beta ${JSON.stringify(c)}`);
        }
    });

    test("alpha and beta are unchanged when hole and plane rotate together about vertical", () => {
        const rnd = mulberry32(11);
        for (const c of cases.slice(0, 1000)) {
            const turn = rnd() * 360;
            const a = Geo.dipDipdirToAlphaBeta(c.az, c.holeDip, c.dip, c.dipdir);
            const b = Geo.dipDipdirToAlphaBeta(c.az + turn, c.holeDip, c.dip, c.dipdir + turn);
            near(b.alpha, a.alpha, 1e-9);
            nearAngle(b.beta, a.beta, 1e-7);
        }
    });

    test("true thickness never exceeds downhole length and equals L*sin(alpha)", () => {
        for (const c of cases) {
            const { alpha } = Geo.dipDipdirToAlphaBeta(c.az, c.holeDip, c.dip, c.dipdir);
            const tt = Geo.trueThicknessFromAlpha(10, alpha);
            assert.ok(tt >= 0 && tt <= 10);
            near(tt, 10 * Math.sin(alpha * DEG), 1e-12);
        }
    });

    test("strike follows the right-hand rule (dip direction - 90)", () => {
        for (const c of cases.slice(0, 500)) {
            const r = Geo.alphaBetaToDipDipdir(c.az, c.holeDip, 45, c.dipdir);
            nearAngle(r.strike, r.dipdir - 90, 1e-9);
        }
    });
});

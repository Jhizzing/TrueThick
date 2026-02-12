import numpy as np

# -----------------------------
# Helpers
# -----------------------------

def deg2rad(deg):
    return np.deg2rad(deg)


def _safe_normalize(v):
    """Normalize a vector, raising ValueError if it is degenerate (zero-length)."""
    norm = np.linalg.norm(v)
    if norm < 1e-10:
        raise ValueError("Degenerate input produced a zero-length vector.")
    return v / norm

# -----------------------------
# Hole Vector
# -----------------------------

def hole_vector(azimuth_deg, dip_deg):
    """
    Unit vector of drillhole direction (downhole)
    Azimuth: degrees from north, clockwise
    Dip: negative down
    """
    az = deg2rad(azimuth_deg)
    dip = deg2rad(dip_deg)

    x = np.sin(az) * np.cos(dip)
    y = np.cos(az) * np.cos(dip)
    z = np.sin(dip)

    v = np.array([x, y, z])
    return _safe_normalize(v)

# -----------------------------
# Plane from Dip / DipDir
# -----------------------------

def plane_normal_from_dip_dipdir(dip_deg, dipdir_deg):
    """
    Returns unit normal vector of plane
    """
    dip = deg2rad(dip_deg)
    dipdir = deg2rad(dipdir_deg)

    strike = dipdir - np.pi / 2

    nx = np.sin(dip) * np.sin(strike)
    ny = np.sin(dip) * np.cos(strike)
    nz = np.cos(dip)

    n = np.array([nx, ny, nz])
    return _safe_normalize(n)

# -----------------------------
# Alpha / Beta from Orientation
# -----------------------------

def alpha_normal(hole_vec, plane_normal):
    """
    Angle between hole vector and plane normal (degrees)
    """
    dot = np.dot(hole_vec, plane_normal)
    alpha = np.arccos(np.clip(abs(dot), -1.0, 1.0))
    return np.rad2deg(alpha)


def alpha_kenometer(alpha_normal_deg):
    """
    Convert to kenometer alpha (angle to plane surface)
    """
    return 90.0 - alpha_normal_deg


def beta_angle(hole_vec, plane_normal):
    """
    Beta using right-hand rule (clockwise looking downhole)
    """
    hole_proj = hole_vec - np.dot(hole_vec, plane_normal) * plane_normal
    hole_proj = _safe_normalize(hole_proj)

    # Dip direction vector
    dip_dir_vec = np.cross(plane_normal, [0, 0, 1])
    dip_dir_vec = _safe_normalize(dip_dir_vec)

    dot = np.dot(hole_proj, dip_dir_vec)
    beta = np.arccos(np.clip(dot, -1.0, 1.0))
    return np.rad2deg(beta)

# -----------------------------
# True Thickness & Accumulation
# -----------------------------

def true_thickness_from_alpha(downhole_length, alpha_keno_deg):
    """
    True thickness from kenometer alpha
    TT = Length * sin(alpha)
    """
    return downhole_length * np.sin(deg2rad(alpha_keno_deg))

def calculate_gram_meters(grade, true_thickness):
    """
    Metal accumulation / Gram-meters
    """
    return grade * true_thickness

# -----------------------------
# Alpha/Beta → Orientation Solver
# -----------------------------

def alpha_beta_to_plane_normal(hole_az_deg, hole_dip_deg, alpha_deg, beta_deg):
    """
    Convert kenometer alpha/beta to plane normal vector in world coordinates
    Right-hand rule beta: clockwise looking downhole is positive
    """

    az = deg2rad(hole_az_deg)
    dip = deg2rad(hole_dip_deg)
    alpha = deg2rad(alpha_deg)
    beta = deg2rad(beta_deg)

    # Hole vector
    hx = np.sin(az) * np.cos(dip)
    hy = np.cos(az) * np.cos(dip)
    hz = np.sin(dip)
    hole_vec = np.array([hx, hy, hz])
    hole_vec = _safe_normalize(hole_vec)

    # Build orthonormal basis around hole
    if abs(hole_vec[2]) < 0.9:
        ref = np.array([0, 0, 1])
    else:
        ref = np.array([1, 0, 0])

    v1 = np.cross(hole_vec, ref)
    v1 = _safe_normalize(v1)

    v2 = np.cross(hole_vec, v1)
    v2 = _safe_normalize(v2)

    # Plane normal in hole frame
    n_hole = (
        np.cos(alpha) * hole_vec +
        np.sin(alpha) * (np.cos(beta) * v1 + np.sin(beta) * v2)
    )

    n_hole = _safe_normalize(n_hole)
    return n_hole


def normal_to_dip_dipdir(normal_vec):
    """
    Convert plane normal vector to dip and dip direction
    """
    nx, ny, nz = normal_vec

    dip_rad = np.arccos(abs(nz))
    dip_deg = np.rad2deg(dip_rad)

    dip_dir_rad = np.arctan2(nx, ny)
    dip_dir_deg = np.rad2deg(dip_dir_rad)
    if dip_dir_deg < 0:
        dip_dir_deg += 360.0

    return dip_deg, dip_dir_deg


def alpha_beta_to_dip_dipdir(hole_az, hole_dip, alpha, beta):
    """
    Public function: alpha/beta → dip, dipdir, strike
    """
    normal = alpha_beta_to_plane_normal(hole_az, hole_dip, alpha, beta)
    dip, dipdir = normal_to_dip_dipdir(normal)

    strike = dipdir - 90.0
    if strike < 0:
        strike += 360.0

    return dip, dipdir, strike

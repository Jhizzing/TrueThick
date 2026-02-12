import logging
import os

import streamlit as st

from geometry import (
    hole_vector,
    plane_normal_from_dip_dipdir,
    alpha_normal,
    alpha_kenometer,
    beta_angle,
    true_thickness_from_alpha,
    calculate_gram_meters,
    alpha_beta_to_dip_dipdir
)

logger = logging.getLogger(__name__)

# -----------------------------
# Page Config
# -----------------------------
st.set_page_config(
    page_title="TrueThick | LogiQore Inspired",
    page_icon="🪨",
    layout="centered"
)

# -----------------------------
# Custom CSS (LogiQore Aesthetic)
# SECURITY: All HTML below is static/hardcoded. Never interpolate user
# input into these unsafe_allow_html blocks — doing so creates XSS risk.
# -----------------------------
st.markdown("""
<style>
    /* Global Styles — using system font stack instead of external Google Fonts */
    html, body, [data-testid="stAppViewContainer"] {
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        background-color: #0E1117;
    }

    /* Hide Streamlit Header & Footer */
    [data-testid="stHeader"] {
        display: none;
    }
    
    .block-container {
        padding-top: 2rem !important;
    }

    /* Glassmorphic Container */
    .glass-card {
        background: rgba(30, 35, 43, 0.6);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.05);
        border-radius: 16px;
        padding: 2rem;
        margin-bottom: 2rem;
        box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
    }

    /* Gold Accents & Glow */
    .stButton > button {
        background-color: #DAA520 !important;
        color: #000 !important;
        font-weight: 800 !important;
        border-radius: 50px !important;
        border: none !important;
        padding: 0.6rem 2rem !important;
        transition: all 0.3s ease !important;
        box-shadow: 0 0 15px rgba(218, 165, 32, 0.4) !important;
        width: 100%;
    }

    .stButton > button:hover {
        transform: translateY(-2px);
        box-shadow: 0 0 25px rgba(218, 165, 32, 0.6) !important;
        background-color: #FFD700 !important;
    }

    /* Metric Styling */
    [data-testid="stMetricValue"] {
        color: #DAA520 !important;
        font-weight: 800;
        font-size: 2.5rem !important;
    }

    [data-testid="stMetricLabel"] {
        color: #888 !important;
        text-transform: uppercase;
        letter-spacing: 0.1rem;
        font-size: 0.8rem !important;
    }

    /* Divider */
    hr {
        border-top: 1px solid rgba(255, 255, 255, 0.1) !important;
    }

    /* Titles */
    h1, h2, h3 {
        color: #FFF !important;
        font-weight: 800 !important;
        letter-spacing: -0.02em;
    }

    .main-title {
        background: linear-gradient(90deg, #FFFFFF 0%, #DAA520 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        font-size: 3.5rem !important;
        margin-bottom: 0px;
        line-height: 1.1;
    }

    /* Tab Styling */
    .stTabs [data-baseweb="tab-list"] {
        gap: 2rem;
        background-color: transparent;
    }

    .stTabs [data-baseweb="tab"] {
        height: 50px;
        white-space: pre-wrap;
        background-color: transparent;
        border-radius: 0px;
        color: #888;
        font-weight: 600;
        font-size: 1rem;
        border-bottom: 2px solid transparent;
        transition: all 0.3s ease;
    }

    .stTabs [aria-selected="true"] {
        color: #DAA520 !important;
        border-bottom: 2px solid #DAA520 !important;
        background-color: rgba(218, 165, 32, 0.05) !important;
    }
</style>
""", unsafe_allow_html=True)

# -----------------------------
# Header Section
# -----------------------------
# SECURITY: Logo loaded locally to avoid external resource dependency.
# Place a logo.png in the project root to display it; falls back to icon.
col_logo, col_title = st.columns([1, 4])
with col_logo:
    _logo_path = os.path.join(os.path.dirname(__file__), "logo.png")
    if os.path.isfile(_logo_path):
        st.image(_logo_path, width=100)
    else:
        st.markdown("### 🪨")

with col_title:
    st.markdown('<h1 class="main-title">TrueThick</h1>', unsafe_allow_html=True)
    st.caption("Modern Structural Orientation & True Thickness Analysis")

st.write("") # Spacer

# -----------------------------
# Main Application Tabs
# -----------------------------
tab_orientation, tab_intercept = st.tabs(["Orientation Solver", "Intercept Analysis"])

# ==========================================
# TAB 1: ORIENTATION SOLVER
# ==========================================
with tab_orientation:
    st.subheader("Structural Orientation Tool")
    st.caption("Convert between Kenometer measurements and geological orientation.")
    
    # 1. Configuration
    col_mode, col_blank = st.columns([2, 1])
    with col_mode:
        mode = st.radio(
            "Measurement Input Mode",
            ["Alpha/Beta (Kenometer)", "Dip/DipDir (Orientation)"],
            horizontal=True,
            key="tab1_mode"
        )

    st.markdown("---")
    
    # 2. Drillhole Orientation
    st.subheader("Drillhole Orientation")
    col_h1, col_h2 = st.columns(2)
    with col_h1:
        hole_az = st.number_input("Hole Azimuth (°)", 0.0, 360.0, 240.0, 1.0, key="tab1_az")
    with col_h2:
        hole_dip = st.number_input("Hole Dip (°)", -90.0, 0.0, -60.0, 1.0, key="tab1_dip")

    st.markdown("---")

    # 3. Measurement Inputs
    if mode == "Alpha/Beta (Kenometer)":
        st.subheader("Kenometer Measurements")
        col_k1, col_k2 = st.columns(2)
        with col_k1:
            alpha = st.number_input("Alpha (°)", 0.0, 90.0, 60.0, 1.0, key="tab1_alpha")
        with col_k2:
            beta = st.number_input("Beta (°)", 0.0, 360.0, 30.0, 1.0, key="tab1_beta")
    else:
        st.subheader("Structure Orientation")
        col_s1, col_s2 = st.columns(2)
        with col_s1:
            struct_dipdir = st.number_input("Dip Direction (°)", 0.0, 360.0, 135.0, 1.0, key="tab1_dipdir")
        with col_s2:
            struct_dip = st.number_input("Dip (°)", 0.0, 90.0, 45.0, 1.0, key="tab1_s_dip")

    st.write("")
    if st.button("SOLVE ORIENTATION", type="primary"):
        st.markdown("---")
        try:
            if mode == "Alpha/Beta (Kenometer)":
                dip, dipdir, strike = alpha_beta_to_dip_dipdir(hole_az, hole_dip, alpha, beta)
                st.subheader("Final Orientation")
                col_o1, col_o2, col_o3 = st.columns(3)
                col_o1.metric("DIP", f"{dip:.1f}°")
                col_o2.metric("DIP DIRECTION", f"{dipdir:.1f}°")
                col_o3.metric("STRIKE", f"{strike:.1f}°")
            else:
                hv = hole_vector(hole_az, hole_dip)
                pn = plane_normal_from_dip_dipdir(struct_dip, struct_dipdir)
                a_norm = alpha_normal(hv, pn)
                a_keno = alpha_kenometer(a_norm)
                b_val = beta_angle(hv, pn)
                st.subheader("Kenometer Geometry")
                col_r1, col_r2, col_r3 = st.columns(3)
                col_r1.metric("ALPHA", f"{a_keno:.1f}°")
                col_r2.metric("BETA", f"{b_val:.1f}°")

        except Exception:
            logger.exception("Orientation calculation failed")
            st.error("A calculation error occurred. Please check your inputs and try again.")

# ==========================================
# TAB 2: INTERCEPT ANALYSIS
# ==========================================
with tab_intercept:
    st.subheader("Significant Intercept Analysis")
    st.caption("Calculate True Thickness and metal accumulation (Gram-Meters).")

    # 1. Orientation Context
    st.write("**Drillhole Orientation**")
    col_i1, col_i2 = st.columns(2)
    with col_i1:
        i_hole_az = st.number_input("Hole Azimuth (°)", 0.0, 360.0, 240.0, 1.0, key="tab2_az")
    with col_i2:
        i_hole_dip = st.number_input("Hole Dip (°)", -90.0, 0.0, -60.0, 1.0, key="tab2_dip")

    st.markdown("---")

    # 2. Method Selection
    st.subheader("Calculation Method")
    method = st.radio(
        "Which information do you have?",
            ["Structural Orientation (Dip/DipDir)", "Alpha Angle (Kenometer)"],
        horizontal=True,
        key="tab2_method"
    )

    if method == "Structural Orientation (Dip/DipDir)":
        col_s1, col_s2 = st.columns(2)
        with col_s1:
            i_struct_dipdir = st.number_input("Structure Dip Direction (°)", 0.0, 360.0, 135.0, 1.0, key="tab2_dipdir")
        with col_s2:
            i_struct_dip = st.number_input("Structure Dip (°)", 0.0, 90.0, 45.0, 1.0, key="tab2_s_dip")
    else:
        col_alpha, _ = st.columns(2)
        with col_alpha:
            i_alpha = st.number_input("Direct Alpha Angle (°)", 0.0, 90.0, 60.0, 1.0, key="tab2_alpha")

    st.markdown("---")

    # 3. Intercept Data
    st.subheader("Intercept Details")
    col_d1, col_d2 = st.columns(2)
    with col_d1:
        interval = st.number_input("Downhole Length (m)", 0.0, 1000.0, 10.0, 0.1, key="tab2_len")
    with col_d2:
        grade = st.number_input("Avg Grade (e.g. g/t)", 0.0, 1000.0, 5.0, 0.01, key="tab2_grade")

    st.write("")
    if st.button("ANALYZE INTERCEPT", type="primary"):
        st.markdown("---")
        try:
            # Determine Alpha
            if method == "Structural Orientation (Dip/DipDir)":
                hv = hole_vector(i_hole_az, i_hole_dip)
                pn = plane_normal_from_dip_dipdir(i_struct_dip, i_struct_dipdir)
                a_norm = alpha_normal(hv, pn)
                a_val = alpha_kenometer(a_norm)
            else:
                a_val = i_alpha
            
            # Calculate metrics
            tt = true_thickness_from_alpha(interval, a_val)
            gm = calculate_gram_meters(grade, tt)

            st.subheader("Calculated Metrics")
            col_res1, col_res2, col_res3 = st.columns(3)
            col_res1.metric("TRUE THICKNESS", f"{tt:.2f} m")
            col_res2.metric("GRAM-METERS", f"{gm:.1f}")
            col_res3.metric("INTERSECTION ALPHA", f"{a_val:.1f}°")

            # Interpretation
            st.write("")
            if a_val > 70:
                st.info("🎯 **High-angle intersection:** Near-perpendicular cut. Thickness is reliable.")
            elif a_val > 40:
                st.info("✅ **Moderate-angle intersection:** Reasonable cut.")
            else:
                st.warning("⚠️ **Low-angle intersection:** Shallow cut. Likely apparent thickness inflation.")

        except Exception:
            logger.exception("Intercept calculation failed")
            st.error("A calculation error occurred. Please check your inputs and try again.")

# -----------------------------
# Footer
# -----------------------------
st.write("")
st.write("")
st.caption("TrueThick v2.0 | Powered by LogiQore Aesthetics")


"""
CornLab Game Engine — field generation, sampling, statistics, hypothesis test.
Pure Python, no framework dependency.
"""
import random
import math
import json


# ── Chapter configurations ────────────────────────────────────────────────────
CHAPTERS = {
    1: {"true_mean": 50.0, "true_std": 5.0,  "h0_mean": 50.0, "label": "Tutorial"},
    2: {"true_mean": 52.0, "true_std": 5.0,  "h0_mean": 50.0, "label": "Basic Investigation"},
    3: {"true_mean": 48.5, "true_std": 7.0,  "h0_mean": 50.0, "label": "Conflicting Data"},
    4: {"true_mean": 53.0, "true_std": 12.0, "h0_mean": 50.0, "label": "High Variance"},
    5: {"true_mean": 49.0, "true_std": 6.0,  "h0_mean": 50.0, "label": "Policy Decision"},
}

GRID_SIZE   = 12   # 12×12 = 144 plots
SAMPLE_SIZE = 35
ALPHA       = 0.05


def generate_field(chapter: int, seed: int = 42) -> list[list[float]]:
    """Return 12×12 grid of yield values for the given chapter."""
    cfg = CHAPTERS[chapter]
    rng = random.Random(seed)
    grid = []
    for r in range(GRID_SIZE):
        row = []
        for c in range(GRID_SIZE):
            # Naturalistic: add spatial gradient + weather noise
            spatial_bias = 0.5 * math.sin(r / GRID_SIZE * math.pi)
            val = rng.gauss(cfg["true_mean"] + spatial_bias, cfg["true_std"])
            row.append(round(val, 2))
        grid.append(row)
    return grid


def draw_sample(field: list[list[float]], n: int = SAMPLE_SIZE, seed: int = 42) -> list[float]:
    """Randomly sample n plots from the field (without replacement)."""
    flat = [v for row in field for v in row]
    rng  = random.Random(seed + 1000)
    return rng.sample(flat, n)


def compute_stats(sample: list[float]) -> dict:
    n    = len(sample)
    mean = sum(sample) / n
    var  = sum((x - mean) ** 2 for x in sample) / (n - 1)
    std  = math.sqrt(var)
    se   = std / math.sqrt(n)
    return {"n": n, "mean": round(mean, 4), "std": round(std, 4), "se": round(se, 4)}


def t_test_one_sample(sample: list[float], mu0: float) -> dict:
    """One-sample t-test against mu0."""
    stats  = compute_stats(sample)
    t_stat = (stats["mean"] - mu0) / stats["se"]
    df     = stats["n"] - 1
    # Two-tailed p-value approximation (Abramowitz & Stegun)
    p_val  = _t_pvalue(abs(t_stat), df)
    ci_lo  = stats["mean"] - 2.042 * stats["se"]   # ~95% CI for df≈34
    ci_hi  = stats["mean"] + 2.042 * stats["se"]
    return {
        **stats,
        "t_stat":  round(t_stat, 4),
        "p_value": round(p_val, 4),
        "ci_lo":   round(ci_lo, 4),
        "ci_hi":   round(ci_hi, 4),
        "reject_h0": p_val < ALPHA,
    }


def _t_pvalue(t: float, df: int) -> float:
    """Approximate two-tailed p-value using regularised incomplete beta."""
    x = df / (df + t * t)
    p = _betainc(df / 2, 0.5, x)
    return min(p, 1.0)


def _betainc(a: float, b: float, x: float) -> float:
    """Continued-fraction approximation of regularised incomplete beta I_x(a,b)."""
    if x <= 0: return 0.0
    if x >= 1: return 1.0
    lbeta = math.lgamma(a) + math.lgamma(b) - math.lgamma(a + b)
    front = math.exp(math.log(x) * a + math.log(1 - x) * b - lbeta) / a
    # Lentz continued fraction
    TINY = 1e-30
    f = TINY; C = f; D = 0.0
    for m in range(200):
        for sign in (1, -1):
            if m == 0 and sign == 1:
                d = 1.0
            elif sign == 1:
                d = m * (b - m) * x / ((a + 2*m - 1) * (a + 2*m))
            else:
                d = -(a + m) * (a + b + m) * x / ((a + 2*m) * (a + 2*m + 1))
            D = 1 + d * D; D = TINY if abs(D) < TINY else D; D = 1 / D
            C = 1 + d / C; C = TINY if abs(C) < TINY else C
            f *= C * D
            if abs(C * D - 1) < 1e-10:
                return front * (f - TINY)
    return front * (f - TINY)


def evaluate_decision(chapter: int, h0_accepted: bool) -> dict:
    """Return correctness + error type for a player decision."""
    cfg         = CHAPTERS[chapter]
    null_true   = abs(cfg["true_mean"] - cfg["h0_mean"]) < 0.5   # H0 actually true?
    correct     = (h0_accepted == null_true)
    type1       = (not h0_accepted) and null_true
    type2       = h0_accepted and (not null_true)
    return {"correct": correct, "type1_error": type1, "type2_error": type2,
            "null_true": null_true, "true_mean": cfg["true_mean"]}


def histogram_bins(sample: list[float], bins: int = 10) -> dict:
    lo, hi = min(sample), max(sample)
    width  = (hi - lo) / bins
    edges  = [round(lo + i * width, 2) for i in range(bins + 1)]
    counts = [0] * bins
    for v in sample:
        idx = min(int((v - lo) / width), bins - 1)
        counts[idx] += 1
    return {"edges": edges, "counts": counts}

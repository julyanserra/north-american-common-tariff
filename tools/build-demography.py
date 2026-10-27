"""Compute the demographic figures used on the site from UN World Population Prospects 2024.

Input: from the wpp2024 data package (https://github.com/PPgp/wpp2024, data/), thousands:
       popprojAge1dt.rda (projections, medium variant) and popAge1dt.rda (estimates to 2023).
Output: demog.json with, for 2025 and 2050, totals, median age, age shares,
        working-age population (15-64) and 5-year pyramids for CA, US, MX,
        plus North America (sum of the three), EU-27, China, Japan, Germany and India;
        and waIndex: working-age population 2000-2050 for NA, CN, EU and JP, 2000 = 100.

Usage: pip install pyreadr pandas numpy
       python build-demography.py popprojAge1dt.rda demog.json popAge1dt.rda
"""
import json
import sys

import numpy as np
import pandas as pd
import pyreadr

COUNTRIES = {"CA": [124], "US": [840], "MX": [484], "CN": [156], "JP": [392], "DE": [276], "IN": [356]}
EU27 = [40, 56, 100, 191, 196, 203, 208, 233, 246, 250, 276, 300, 348, 372, 380, 428,
        440, 442, 470, 528, 616, 620, 642, 703, 705, 724, 752]
GROUPS = {**COUNTRIES, "NA": [124, 840, 484], "EU": EU27}


def stats(df):
    df = df.groupby("age", as_index=False)[["popM", "popF"]].sum().sort_values("age")
    pop = (df.popM + df.popF).values
    ages = df.age.values
    total = pop.sum()
    cum = np.cumsum(pop)
    i = np.searchsorted(cum, total / 2)
    prev = cum[i - 1] if i > 0 else 0
    median = ages[i] + (total / 2 - prev) / pop[i]  # interpolate within the single-year age
    working = pop[(ages >= 15) & (ages < 65)].sum()
    pyramid = []
    for a in range(0, 100, 5):
        g = df[(df.age >= a) & (df.age < a + 5)]
        pyramid.append([round(g.popM.sum()), round(g.popF.sum())])
    g = df[df.age >= 100]
    pyramid.append([round(g.popM.sum()), round(g.popF.sum())])
    return {
        "total": round(total),
        "median": round(float(median), 1),
        "u15": round(float(100 * pop[ages < 15].sum() / total), 1),
        "wa": round(float(100 * working / total), 1),
        "o65": round(float(100 * pop[ages >= 65].sum() / total), 1),
        "wa_k": round(working),
        "oadr": round(float(100 * pop[ages >= 65].sum() / working), 1),
        "pyr": pyramid,
    }


def working_age_index(est, proj, keys=("NA", "CN", "EU", "JP")):
    """Working-age population by year, estimates through 2023 and projections after, indexed to 2000 = 100."""
    df = pd.concat([est[est.year <= 2023], proj[proj.year >= 2024]])
    df = df[(df.age >= 15) & (df.age < 65) & (df.year >= 2000) & (df.year <= 2050)]
    out = {}
    for k in keys:
        wa = df[df.country_code.isin(GROUPS[k])].groupby("year")[["popM", "popF"]].sum().sum(axis=1)
        out[k] = {str(y): round(float(100 * v / wa[2000]), 1) for y, v in wa.items()}
    return out


def main(src, dst, est_src=None):
    proj = pyreadr.read_r(src)["popprojAge1dt"]
    proj["year"] = proj["year"].astype(int)
    out = {}
    for year in (2025, 2050):
        out[str(year)] = {k: stats(proj[(proj.country_code.isin(c)) & (proj.year == year)]) for k, c in GROUPS.items()}
    if est_src:
        est = pyreadr.read_r(est_src)["popAge1dt"]
        est["year"] = est["year"].astype(int)
        out["waIndex"] = working_age_index(est, proj)
    json.dump(out, open(dst, "w"))
    for k in GROUPS:
        a, b = out["2025"][k]["wa_k"], out["2050"][k]["wa_k"]
        print(f"{k}: median {out['2025'][k]['median']}, working-age change 2025-2050 {100 * (b - a) / a:+.1f}%")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2], sys.argv[3] if len(sys.argv) > 3 else None)

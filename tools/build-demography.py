"""Compute the demographic figures used on the site from UN World Population Prospects 2024.

Input: popprojAge1dt.rda from the wpp2024 data package
       (https://github.com/PPgp/wpp2024, data/popprojAge1dt.rda), medium variant, thousands.
Output: demog.json with, for 2025 and 2050, totals, median age, age shares,
        working-age population (15-64) and 5-year pyramids for CA, US, MX,
        plus North America (sum of the three), EU-27, China, Japan, Germany and India.

Usage: pip install pyreadr pandas numpy
       python build-demography.py path/to/popprojAge1dt.rda demog.json
"""
import json
import sys

import numpy as np
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


def main(src, dst):
    proj = pyreadr.read_r(src)["popprojAge1dt"]
    proj["year"] = proj["year"].astype(int)
    out = {}
    for year in (2025, 2050):
        out[str(year)] = {k: stats(proj[(proj.country_code.isin(c)) & (proj.year == year)]) for k, c in GROUPS.items()}
    json.dump(out, open(dst, "w"))
    for k in GROUPS:
        a, b = out["2025"][k]["wa_k"], out["2050"][k]["wa_k"]
        print(f"{k}: median {out['2025'][k]['median']}, working-age change 2025-2050 {100 * (b - a) / a:+.1f}%")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])

// The continent silhouette for the footer's "Made in North America" stamp: Canada, the
// United States and Mexico merged into one outline, simplified to a small path.
//   cd tools && node build-stamp.mjs   → prints the path for the stamp's <path d="…">
import fs from 'fs';
import * as topojson from 'topojson-client';
import * as simp from 'topojson-simplify';
import { geoConicEqualArea, geoPath, geoBounds, geoArea } from 'd3-geo';

const raw = JSON.parse(fs.readFileSync('node_modules/world-atlas/countries-110m.json'));
const pre = simp.presimplify(raw);
const topo = simp.simplify(pre, simp.quantile(pre, +(process.env.Q || 0.35)));
const sel = new Set(['124', '840', '484']);
const merged = topojson.merge(topo, topo.objects.countries.geometries.filter(g => sel.has(g.id)));
// Keep the mainland and the large Arctic islands; drop Hawaii, the Aleutians and small islets.
merged.coordinates = merged.coordinates.filter(p => {
  const g = { type: 'Polygon', coordinates: p };
  const [[x0, y0], [x1, y1]] = geoBounds(g);
  if (y1 < 30 && x0 < -150) return false;
  if (x0 > 0 || x1 < -168 || Math.abs(x1 - x0) > 180) return false;
  return geoArea(g) > 2.5e-4;
});
const S = 100;
const proj = geoConicEqualArea().parallels([20, 60]).rotate([100, 0]).center([0, 45]);
proj.fitExtent([[0, 0], [S, S]], merged);
// Drop repeated points that rounding to one decimal creates.
const d = geoPath(proj).digits(1)(merged).replace(/L([\d.]+,[\d.]+)(?=L\1(?![\d.]))/g, '');
const [[bx0, by0], [bx1, by1]] = geoPath(proj).bounds(merged);
console.log(JSON.stringify({ bounds: [bx0, by0, bx1, by1].map(v => +v.toFixed(1)), length: d.length }));
console.log(d);

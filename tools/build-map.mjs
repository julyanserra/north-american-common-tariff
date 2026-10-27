import fs from 'fs';
import * as topojson from 'topojson-client';
import * as simp from 'topojson-simplify';
import { geoConicEqualArea, geoPath, geoBounds, geoArea } from 'd3-geo';
const raw = JSON.parse(fs.readFileSync('node_modules/world-atlas/countries-50m.json'));
const pre = simp.presimplify(raw);
const topo = simp.simplify(pre, simp.quantile(pre, +(process.env.Q || 0.5)));
const geoms = topo.objects.countries.geometries;
const ID = { CA: '124', US: '840', MX: '484' };
const feats = topojson.feature(topo, topo.objects.countries).features;
const byId = id => feats.find(f => f.id === id);
// Drop Hawaii and far-west Aleutian specks so the frame centres on the continent.
function trim(f) {
  if (f.geometry.type !== 'MultiPolygon') return f;
  const polys = f.geometry.coordinates.filter(p => {
    const g = { type: 'Polygon', coordinates: p };
    const [[x0, y0], [x1, y1]] = geoBounds(g);
    if (y1 < 30 && x0 < -150) return false;             // Hawaii
    if (x1 > 0 && x0 < 0 && Math.abs(x1 - x0) > 180) return false;
    if (x0 > 0 || x1 < -168) return false;              // western Aleutians
    return geoArea(g) > 2e-6;                           // tiny islets
  });
  return { ...f, geometry: { type: 'MultiPolygon', coordinates: polys } };
}
const three = ['CA', 'US', 'MX'].map(k => trim(byId(ID[k])));
const W = 1000, H = 860;
const proj = geoConicEqualArea().parallels([20, 60]).rotate([100, 0]).center([0, 45]);
proj.fitExtent([[20, 20], [W - 20, H - 20]], { type: 'FeatureCollection', features: three });
const path = geoPath(proj).digits(1);
const out = {};
['CA', 'US', 'MX'].forEach((k, i) => out[k] = path(three[i]));
const sel = new Set(Object.values(ID));
const trimmedGeoms = geoms.filter(g => sel.has(g.id));
out.borders = path(topojson.mesh(topo, { type: 'GeometryCollection', geometries: trimmedGeoms }, (a, b) => a !== b && sel.has(a.id) && sel.has(b.id)));
out.perimeter = path(trim({ type: 'Feature', geometry: topojson.merge(topo, trimmedGeoms) }));
// Muted context: neighbours visible in the frame
const ctxIds = new Set(['304', '320', '84', '222', '340', '558', '188', '591', '192', '388', '332', '214', '44', '630', '170', '862']);
out.context = feats.filter(f => ctxIds.has(f.id)).map(f => path(f)).join('');
out.viewBox = `0 0 ${W} ${H}`;
// Label anchors (projected)
const pt = (lon, lat) => proj([lon, lat]).map(v => Math.round(v));
out.labels = { CA: pt(-105, 59), US: pt(-99, 39), MX: pt(-102.5, 23.5) };
// Ports for the "one perimeter" illustration
out.ports = {
  vancouver: pt(-123.1, 49.3), halifax: pt(-63.6, 44.6), montreal: pt(-73.6, 45.5),
  la: pt(-118.2, 33.7), houston: pt(-95.0, 29.7), ny: pt(-74.0, 40.7), savannah: pt(-81.1, 32.1),
  manzanillo: pt(-104.3, 19.05), veracruz: pt(-96.1, 19.2), lazaro: pt(-102.2, 17.95),
  monterrey: pt(-100.3, 25.7), laredo: pt(-99.5, 27.5), detroit: pt(-83.0, 42.3), mexicocity: pt(-99.1, 19.4), toronto: pt(-79.4, 43.7), chicago: pt(-87.6, 41.9)
};
fs.writeFileSync('map.json', JSON.stringify(out));
console.log(Object.fromEntries(Object.entries(out).map(([k, v]) => [k, typeof v === 'string' ? v.length : v])));

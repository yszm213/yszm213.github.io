"""K-Means k=5 sur IRVE_nettoye_2 (points de charge FR uniques, métropole) + ~140 points représentatifs.
Usage : python -I kmeans_irve.py <csv> [out.json]   (sans out.json : compare seulement les variantes)"""
import csv, sys, json
import numpy as np

src = sys.argv[1]
rows, seen = [], set()
for r in csv.DictReader(open(src, encoding='utf-8', newline='')):
    i = r['id_pdc_itinerance'].strip()
    if not i.startswith('FR') or i in seen:
        continue
    seen.add(i)
    try:
        lat, lon = float(r['consolidated_latitude']), float(r['consolidated_longitude'])
        p = float(r['puissance_nominale'] or 'nan')
    except ValueError:
        continue
    if 41 <= lat <= 51.2 and -5.3 <= lon <= 9.7:
        rows.append((lat, lon, p))
A = np.array(rows)
lat, lon, pw = A[:, 0], A[:, 1], A[:, 2]
print('points métropole :', len(A))

rng = np.random.default_rng(42)

def kmeans(X, k, n_init=5, iters=100):
    best = None
    for _ in range(n_init):
        C = X[rng.integers(len(X))][None]
        while len(C) < k:  # k-means++
            d = ((X[:, None] - C[None]) ** 2).sum(-1).min(1)
            C = np.vstack([C, X[rng.choice(len(X), p=d / d.sum())]])
        for _ in range(iters):
            lab = ((X[:, None] - C[None]) ** 2).sum(-1).argmin(1)
            NC = np.array([X[lab == j].mean(0) if (lab == j).any() else C[j] for j in range(k)])
            if np.allclose(NC, C):
                break
            C = NC
        inertia = ((X - C[lab]) ** 2).sum()
        if best is None or inertia < best[0]:
            best = (inertia, lab, C)
    return best[1], best[2]

def silhouette(X, lab, n=3000):
    idx = rng.choice(len(X), min(n, len(X)), replace=False)
    S, L = X[idx], lab[idx]
    D = np.sqrt(((S[:, None] - S[None]) ** 2).sum(-1))
    s = []
    for i in range(len(S)):
        same = L == L[i]
        a = D[i, same].sum() / max(same.sum() - 1, 1)
        b = min(D[i, L == j].mean() for j in set(L) if j != L[i])
        s.append((b - a) / max(a, b))
    return float(np.mean(s))

def std(X):
    return (X - X.mean(0)) / X.std(0)

ok = ~np.isnan(pw)
variants = {
    'lat/lon brutes': np.c_[lat, lon],
    'lat/lon standardisées': std(np.c_[lat, lon]),
    'lat/lon/puissance standardisées': None,
}
Xp = std(np.c_[lat[ok], lon[ok], pw[ok]])
results = {}
for name, X in variants.items():
    if X is None:
        X = Xp
    lab, C = kmeans(X, 5)
    results[name] = (silhouette(X, lab), lab, X)
    print(f'{name:34s} silhouette k=5 : {results[name][0]:.3f}')

if len(sys.argv) < 3:
    sys.exit()

# Variante retenue : la plus proche du 0,506 du rapport MaStation
name = min(results, key=lambda n: abs(results[n][0] - 0.506))
sil, lab, X = results[name]
if name.endswith('puissance standardisées'):
    lat, lon = lat[ok], lon[ok]
print('retenue :', name, round(sil, 3))

# Points représentatifs : 1 point ≈ 1 000 bornes. Dans chaque cluster, nombre de points proportionnel
# à sa taille ; leur position = centres d'un K-Means interne (ils suivent donc la densité réelle).
order = np.argsort(-np.bincount(lab))  # cluster 0 = le plus gros, couleurs stables
remap = {int(c): i for i, c in enumerate(order)}
G = np.c_[lat, lon * np.cos(np.radians(46.5))]  # distances ~ euclidiennes au sol
total = len(G)
pts = []
for c in order:
    m = lab == c
    n = max(1, round(m.sum() / 1000))
    sub, SC = kmeans(G[m], n, n_init=2, iters=60)
    cnt = np.bincount(sub, minlength=n)
    for j in range(n):
        if cnt[j]:
            pts.append([round(float(SC[j, 0]), 3), round(float(SC[j, 1] / np.cos(np.radians(46.5))), 3), remap[int(c)], int(cnt[j])])
clusters = [{'id': remap[int(c)], 'n': int((lab == c).sum()),
             'lat': round(float(lat[lab == c].mean()), 3), 'lon': round(float(lon[lab == c].mean()), 3)} for c in order]
out = {'source': 'IRVE_nettoye_2.csv (MaStation), points de charge FR uniques, France métropolitaine',
       'variables': name, 'k': 5, 'silhouette_echantillon': round(sil, 3), 'total': total,
       'clusters': clusters, 'points': pts, 'format_points': '[lat, lon, cluster, nb_bornes]'}
json.dump(out, open(sys.argv[2], 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
# Copie en .js : lisible aussi quand le site est ouvert en file:// (fetch y est bloqué)
open(sys.argv[2][:-5] + '.js', 'w', encoding='utf-8').write('window.IRVE_CLUSTERS=' + json.dumps(out, ensure_ascii=False, separators=(',', ':')) + ';
')
print('points :', len(pts), 'somme :', sum(p[3] for p in pts), 'clusters :', [c['n'] for c in clusters])

"""Independent numerical check for the heat/water real-data validation bundle.

Usage: python verify_trend_lab_investigation.py INPUT.json OUTPUT.json
Requires numpy and statsmodels (validation only, not production dependencies).
The input is an ignored artifact generated through DataService.investigation.
"""
import json, sys
import numpy as np
import statsmodels.api as sm
from statsmodels.stats.multitest import multipletests
j=json.load(open(sys.argv[1]))
checks=[]
for name in ['heat','water']:
 d=j[name]
 for s in d['series']:
  rows=[r for r in s['observations'] if r['value'] is not None]
  t=np.array([int(r['month'][:4])*12+int(r['month'][5:])-1 for r in rows]); y=np.array([r['value'] for r in rows]);tc=(t-t[0])/12
  X=np.column_stack([np.ones(len(t)),tc,*[(t%12==m).astype(float) for m in range(1,12)]])
  fit=sm.OLS(y,X).fit(cov_type='HAC',cov_kwds={'maxlags':12,'use_correction':True},use_t=False)
  assert np.isclose(fit.params[1],s['trend']['slopePerYear'],rtol=1e-8,atol=1e-10)
  if s['trend']['pValue'] is not None:
   assert np.isclose(fit.bse[1],s['trend']['standardErrorPerYear'],rtol=1e-8,atol=1e-10)
   assert np.isclose(fit.pvalues[1],s['trend']['pValue'],rtol=1e-7,atol=1e-12)
  for ref in s['reference']:
   values=[r['value'] for r in s['referenceObservations'] if int(r['month'][5:])==ref['month'] and r['value'] is not None]
   assert ref['count']==len(values)
   if values:assert np.isclose(ref['mean'],np.mean(values))
   if len(values)>1:assert np.isclose(ref['standardDeviation'],np.std(values,ddof=1))
 for r in d['lags']:
  rows=r['pairs']; t=np.array([int(p['xMonth'][:4])*12+int(p['xMonth'][5:])-1 for p in rows]);x=np.array([p['x'] for p in rows]);y=np.array([p['y'] for p in rows]);tc=(t-t[0])/12
  nuisance=np.column_stack([np.ones(len(t)),tc,*[(t%12==m).astype(float) for m in range(1,12)]])
  xr=sm.OLS(x,nuisance).fit().resid;yr=sm.OLS(y,nuisance).fit().resid
  assert np.isclose(np.corrcoef(xr,yr)[0,1],r['adjustedR'],rtol=1e-8,atol=1e-10)
  X=np.column_stack([nuisance,x]);fit=sm.OLS(y,X).fit(cov_type='HAC',cov_kwds={'maxlags':12,'use_correction':True},use_t=False)
  assert np.isclose(fit.params[-1],r['beta'],rtol=1e-8,atol=1e-10)
  if r['inferenceStatus']=='available':
   assert np.isclose(fit.bse[-1],r['standardError'],rtol=1e-8,atol=1e-10)
   assert np.isclose(fit.pvalues[-1],r['pValue'],rtol=1e-7,atol=1e-12)
   assert np.allclose(fit.conf_int()[-1],r['betaCi95'],rtol=1e-8,atol=1e-10)
  else:assert r['pValue'] is None and r['betaCi95'] is None
  checks.append({'study':name,'lag':r['lag'],'n':r['n'],'rawR':r['rawR'],'adjustedR':r['adjustedR'],'status':r['inferenceStatus'],'matched':True})
 expected=multipletests([t['pValue'] if t['pValue'] is not None else 1 for t in d['family']],method='holm')[1]
 for t,p in zip(d['family'],expected):
  if t['pValue'] is not None:assert np.isclose(t['adjustedP'],p,atol=1e-12,rtol=1e-7)
json.dump({'checks':checks,'allMatched':True,'elapsedMs':j['elapsedMs'],'statements':j['statements']},open(sys.argv[2],'w'),indent=2)
print(json.dumps({'matchedRelationships':len(checks),'matchedTrends':4,'matchedBaselines':4,'elapsedMs':j['elapsedMs'],'examples':[checks[0],checks[8]]},indent=2))

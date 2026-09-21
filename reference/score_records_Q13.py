#!/usr/bin/env python3
"""Q13/29项计分辅助。只派生，不删除行；不包含真实数据或显著性检验。
python scripts/score_records.py input.csv output.csv
CSV需含revision_id=R13、questionnaire_revision_id=Q13；没有版本列则拒绝处理。
"""
from __future__ import annotations
import argparse,csv,json,math
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
SPEC=json.loads((ROOT/'config/questionnaire_Q13_29items.json').read_text(encoding='utf-8'))
QS=SPEC['questions']
NOT_ADMIN=['chinese_reading','social_media_experience','comment_feeling_open','platform_likelihood','readability','specificity','city_context_natural','memory_check','new_risk_text','real_city_guess','purpose_guess','education']

def number(x):
    if x is None or isinstance(x,bool) or str(x).strip()=='': return None
    try:
        v=float(str(x).strip())
    except (ValueError,TypeError): return None
    return v if math.isfinite(v) else None

def integer(x,lo,hi):
    v=number(x)
    return int(v) if v is not None and v.is_integer() and lo<=v<=hi else None

def valid7(x): return integer(x,1,7)
def mean_if(values,minimum):
    v=[x for x in values if x is not None]
    return sum(v)/len(v) if len(v)>=minimum else None

def derive(record):
    r=dict(record)
    if str(r.get('revision_id',''))!='R13' or str(r.get('questionnaire_revision_id',''))!='Q13':
        r['q13_processing_status']='SKIPPED_OTHER_VERSION'
        return r
    invalid=[]
    for q in QS:
        v=r.get(q['variable'])
        if v is None or str(v).strip()=='': continue
        if q['type']=='scale': ok=valid7(v) is not None
        elif q['type']=='integer':ok=integer(v,0,120) is not None
        elif q['type']=='single':ok=integer(v,0,1) is not None
        else:ok=str(v) in [str(o['value']) for o in q['options']]
        if not ok:invalid.append(q['variable'])
    conflicts=[k for k in NOT_ADMIN+['memory_correct'] if r.get(k) not in (None,'')]
    # 审计旧列，不伪造或覆写旧字段；异常旧值要求人工查证。
    r['q13_legacy_conflicts']=';'.join(conflicts)
    r['q13_invalid_fields']=';'.join(invalid)
    r['q13_processing_status']='FLAGGED_INPUT' if conflicts or invalid else 'SCORED'
    r['questionnaire_item_count']=29
    r['not_administered_fields']=';'.join(NOT_ADMIN)
    r['memory_administered']=0
    r['q13_memory_correct']=None
    p=[valid7(r.get(f'planning_{i}')) for i in range(1,4)]
    r['planning_n_valid']=sum(v is not None for v in p)
    r['planning_valid']=int(r['planning_n_valid']==3)
    r['planning_mean']=mean_if(p,3)
    for phase in ['pre','post']:
        v=[valid7(r.get(f'brand_{phase}{i}')) for i in range(1,4)]
        r[f'brand_{phase}_n_valid']=sum(x is not None for x in v)
        r[f'brand_image_{phase}']=mean_if(v,2)
    b0,b1=r['brand_image_pre'],r['brand_image_post']
    r['brand_change']=b1-b0 if b0 is not None and b1 is not None else None
    r['overall_image_valid']=int(b1 is not None)
    r['visit_intention']=mean_if([valid7(r.get('visit1')),valid7(r.get('visit2'))],2)
    for d in 'PAD':
        pre=valid7(r.get(f'self_{d}_pre'));post=valid7(r.get(f'self_{d}_post'))
        delta=post-pre if pre is not None and post is not None else None
        r[f'self_{d}_pair_valid']=int(delta is not None)
        r[f'self_{d}_delta']=delta
        r[f'self_{d}_pre_std']=(pre-4)/3 if pre is not None else None
        r[f'self_{d}_post_std']=(post-4)/3 if post is not None else None
        r[f'self_{d}_delta_std']=delta/3 if delta is not None else None
        # 后测别名冲突时仅标记，不覆写来源真实记录。
        alias=f'self_{d}'
        if r.get(alias) not in (None,'') and valid7(r.get(alias))!=post:
            invalid.append(alias+'__alias_conflict')
        elif r.get(alias) in (None,''):r[alias]=post
        pc=valid7(r.get(f'perceived_comment_{d}'))
        r[f'perceived_comment_{d}_std']=(pc-4)/3 if pc is not None else None
    a=valid7(r.get('attention_check'))
    r['attention_pass']=None if a is None else int(a==6)
    age=integer(r.get('age'),0,120)
    main=(integer(r.get('consent'),0,1)==1 and integer(r.get('eligibility_basic'),0,1)==1
          and age is not None and age>=18 and integer(r.get('randomized'),0,1)==1
          and r.get('condition_id') in ['G1','G2','G3','G4'] and b0 is not None and b1 is not None)
    r['analysis_main_candidate']=int(main)
    r['analysis_moderation_candidate']=int(main and r['planning_valid']==1)
    r['q13_invalid_fields']=';'.join(invalid)
    if invalid:r['q13_processing_status']='FLAGGED_INPUT'
    return r

def score_records(records):
    out=[derive(r) for r in records]
    vals=[r['planning_mean'] for r in out if r.get('analysis_moderation_candidate')==1]
    center=sum(vals)/len(vals) if vals else None
    for r in out:
        if str(r.get('revision_id'))!='R13' or str(r.get('questionnaire_revision_id'))!='Q13':continue
        r['planning_center_reference']=center
        r['planning_center_reference_n']=len(vals)
        r['planning_c']=(r['planning_mean']-center if center is not None and r.get('analysis_moderation_candidate')==1 else None)
    return out

def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('input',type=Path);p.add_argument('output',type=Path)
    args=p.parse_args()
    if args.input.resolve()==args.output.resolve():p.error('输出必须另存，不可覆盖输入。')
    with args.input.open(encoding='utf-8-sig',newline='') as f:
        reader=csv.DictReader(f);fields=reader.fieldnames or [];rows=list(reader)
    if not {'revision_id','questionnaire_revision_id'}<=set(fields):p.error('缺少版本列；不能猜测该CSV属于Q13。请先按实际来源标明版本。')
    out=score_records(rows)
    allfields=list(fields)
    for r in out:
        for k in r:
            if k not in allfields:allfields.append(k)
    with args.output.open('w',encoding='utf-8-sig',newline='') as f:
        writer=csv.DictWriter(f,fieldnames=allfields);writer.writeheader();writer.writerows(out)
    print(f'处理 {len(out)} 行；未删除行；输出 {args.output}')
    print('candidate标记不代替重复/来源/随机化核验；所有统计前须由研究者确认分析集。')
if __name__=='__main__':main()

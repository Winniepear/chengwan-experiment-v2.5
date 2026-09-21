// Pure export scoring. Missing, unadministered, and observed zero are distinct.
export const dims = ['P', 'A', 'D'];
export const planningNames = ['planning_1', 'planning_2', 'planning_3'];
export const brandPreNames = ['brand_pre1', 'brand_pre2', 'brand_pre3'];
export const brandPostNames = ['brand_post1', 'brand_post2', 'brand_post3'];
export function scaleValue(value) {
  if (value === null || value === undefined || value === '' || typeof value === 'boolean' || typeof value === 'object') return null;
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 && n <= 7 ? n : null;
}
export function meanValid(values, names, minimum) {
  const nums = names.map(n => scaleValue(values[n])).filter(v => v !== null);
  return nums.length >= minimum ? nums.reduce((a,b) => a+b,0)/nums.length : null;
}
export const std = v => scaleValue(v) === null ? null : (scaleValue(v)-4)/3;
export function derivedScores(v, participant = {}) {
  const pre = meanValid(v,brandPreNames,2), post = meanValid(v,brandPostNames,2);
  const out = {
    planning_mean: meanValid(v,planningNames,3),
    planning_complete: Number(planningNames.every(n => scaleValue(v[n]) !== null)),
    brand_image_pre: pre, brand_image_post: post, overall_image_valid: Number(post !== null),
    visit_intention: meanValid(v,['visit1','visit2'],2),
  };
  for (const d of dims) {
    const a=scaleValue(v[`self_${d}_pre`]), b=scaleValue(v[`self_${d}_post`]);
    const valid=a!==null && b!==null, delta=valid ? b-a : null;
    out[`self_${d}_std`]=std(v[`self_${d}`]); // legacy field, never overwritten
    out[`perceived_comment_${d}_std`]=std(v[`perceived_comment_${d}`]);
    out[`self_${d}_pre_std`]=std(a);out[`self_${d}_post_std`]=std(b);
    out[`self_${d}_delta`]=delta;out[`self_${d}_delta_std`]=valid?delta/3:null;
    out[`self_${d}_pair_valid`]=Number(valid);
    const alias=scaleValue(v[`self_${d}`]);
    out[`self_${d}_alias_conflict`]=alias!==null && b!==null ? Number(alias!==b):null;
  }
  const isCompact29=['Q11','Q12','Q13'].includes(v.questionnaire_revision_id) || ['R11','R12','R13'].includes(participant.revision_id);
  const attention=v.attention_check;
  out.attention_administered=(attention!==null && attention!==undefined && attention!=='') ? 1:null;
  out.attention_pass=attention===null || attention===undefined || attention==='' ? null :
    (isCompact29 ? (scaleValue(attention)===null?null:Number(Number(attention)===6)) :
      (attention==='比较同意' || Number(attention)===6 ? 1:0));
  out.memory_administered=isCompact29?0:(v.memory_check===null || v.memory_check===undefined || v.memory_check===''?null:1);
  out.memory_correct=null;
  if (!isCompact29 && out.memory_administered===1) {
    let memory=v.memory_check;
    if (typeof memory==='string') {try {memory=JSON.parse(memory);}catch {memory=null;}}
    if (Array.isArray(memory)) {const s=new Set(memory);out.memory_correct=Number(s.size===2 && s.has('有轨电车')&&s.has('按时刻运行的接驳车'));}
  }
  return out;
}

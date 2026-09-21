import crypto from 'node:crypto';
import {derivedScores,meanValid,scaleValue,planningNames,brandPreNames,brandPostNames,dims} from './scoring.mjs';

// SQL is parameterized throughout. The injected database must implement pg-compatible pool/query/connect.
export function createApi({db,CONFIG,MANIFEST,env=process.env,logger=console}) {
const questions=CONFIG.questionnaire.questions;
const byName=new Map(questions.map(q=>[q.variable,q]));
const rawNames=questions.map(q=>q.variable);
const pages=CONFIG.questionnaire.pages;
const pageQuestions=Object.fromEntries(pages.map(p=>[p.page,p.items.map(i=>questions.find(q=>q.number===i).variable)]));
const pageFields={
  ...pageQuestions,
  consent:[...pageQuestions.consent,'device'],
  base_intro:['stimulus_loaded_base','base_scroll_ok','base_time_sec'],
  post_intro:['post_text_loaded','post_images_loaded','post_scroll_ok','post_time_sec'],
  comments:['stimulus_loaded','forced_view_ok','stimulus_time_sec','comment_text_loaded','comment_avatars_loaded'],
};
const edges={consent:['planning','screened_out'],planning:['base_intro'],base_intro:['post_intro'],post_intro:['baseline'],
 baseline:['randomize_ready'],comments:['self_pad_post'],self_pad_post:['outcomes'],outcomes:['perceived'],perceived:['final_checks'],final_checks:['debrief']};
const integerTechnical=new Set(['base_time_sec','post_time_sec','stimulus_time_sec','duration_sec']);
const binaryTechnical=new Set(['stimulus_loaded_base','base_scroll_ok','post_text_loaded','post_images_loaded','post_scroll_ok','stimulus_loaded','forced_view_ok','comment_text_loaded','comment_avatars_loaded','submitted','complete_questionnaire']);
const legacyFields=['chinese_reading','social_media_experience',...CONFIG.removed_raw_fields];
const systemNames=['questionnaire_revision_id','ui_version','deployment_version','post_material_id','stimulus_text_source_revision','survey_item_count'];
const participantColumns=new Set(['consent','age','device','stimulus_loaded_base','base_scroll_ok','base_time_sec','stimulus_loaded','forced_view_ok','stimulus_time_sec']);
const securityHeaders={'cache-control':'no-store','content-security-policy':"default-src 'none'; frame-ancestors 'none'",'permissions-policy':'camera=(), microphone=(), geolocation=()','referrer-policy':'no-referrer','x-content-type-options':'nosniff','x-frame-options':'DENY'};
const fail=(status,detail)=>{throw Object.assign(new Error(detail),{status});};
const now=()=>new Date().toISOString();
const responseJson=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{...securityHeaders,'content-type':'application/json; charset=utf-8'}});
function pathOf(request){let p=new URL(request.url).pathname.replace(/^\/\.netlify\/functions\/api(?=\/|$)/,'').replace(/^\/api(?=\/|$)/,'');return(p||'/').replace(/\/+$/,'')||'/';}
async function parseJson(request){
 if (!request.headers.get('content-type')?.includes('application/json')) fail(415,'json_required');
 if (Number(request.headers.get('content-length'))>64000) fail(413,'request_too_large');
 const text=await request.text();if(Buffer.byteLength(text)>64000)fail(413,'request_too_large');
 let value;try{value=JSON.parse(text);}catch{fail(400,'invalid_json');}
 if(!value||typeof value!=='object'||Array.isArray(value))fail(422,'invalid_payload');return value;
}
function requireAdmin(request){const expected=env.ADMIN_TOKEN;if(!expected)fail(503,'admin_token_not_configured');const a=Buffer.from(String(request.headers.get('x-admin-token')||'')),b=Buffer.from(expected);if(a.length!==b.length||!crypto.timingSafeEqual(a,b))fail(401,'invalid_admin_token');}
function publicConfig(){
 const questionnaire={version:CONFIG.questionnaire_revision_id,instructions:CONFIG.questionnaire.instructions,
   pages:pages.map(p=>({page:p.page,title:p.title,items:p.items})),
   questions:questions.map(q=>Object.fromEntries(['number','variable','title','type','left','right','options','required','help'].map(k=>[k,q[k]])))};
 return {study_title:CONFIG.study_title,mode:CONFIG.mode,wave_id:CONFIG.wave_id,revision_id:CONFIG.revision_id,
 questionnaire_revision_id:CONFIG.questionnaire_revision_id,ui_version:CONFIG.ui_version,deployment_version:CONFIG.deployment_version,item_count:29,
 base_min_seconds:CONFIG.base_min_seconds,post_min_seconds:CONFIG.post_min_seconds,comment_min_seconds:CONFIG.comment_min_seconds,
 city:CONFIG.city,debrief:CONFIG.debrief,questionnaire};
}
function deserialize(row){if(row.value_num!==null&&row.value_num!==undefined)return Number(row.value_num);if(row.value_text===null||row.value_text===undefined)return null;const t=row.value_text;if(t.startsWith('[')||t.startsWith('{')){try{return JSON.parse(t);}catch{}}return t;}
function normalize(name,value){
 if(value===undefined||value===null||value==='')return null;
 const q=byName.get(name);
 if(q){
  if(q.type==='scale'){const n=scaleValue(value);if(n===null)fail(422,`out_of_range:${name}`);return n;}
  if(q.type==='integer') {if(typeof value==='boolean'||typeof value==='object')fail(422,`invalid_integer:${name}`);const n=Number(value);if(!Number.isInteger(n)||n<0||n>120)fail(422,`out_of_range:${name}`);return n;}
  if(q.type==='single'){if(typeof value==='boolean'||typeof value==='object')fail(422,`invalid_option:${name}`);const n=Number(value);if(!q.options.some(o=>o.value===n))fail(422,`invalid_option:${name}`);return n;}
  if(q.type==='single_text'){if(typeof value!=='string'||!q.options.some(o=>(typeof o==='string'?o:o.value)===value))fail(422,`invalid_option:${name}`);return value;}
 }
 if(binaryTechnical.has(name)){if(typeof value==='boolean'||typeof value==='object'||![0,1].includes(Number(value)))fail(422,`out_of_range:${name}`);return Number(value);}
 if(integerTechnical.has(name)){if(typeof value==='boolean'||typeof value==='object'||!Number.isInteger(Number(value))||Number(value)<0)fail(422,`invalid_time:${name}`);return Number(value);}
 if(name==='device'){if(!['mobile','tablet','desktop','unknown'].includes(value))fail(422,'invalid_device');return value;}
 fail(422,`unknown_variable:${name}`);
}
async function answersOf(client,id){const r=await client.query('SELECT variable_name,value_text,value_num FROM responses WHERE respondent_id=$1',[id]);return Object.fromEntries(r.rows.map(row=>[row.variable_name,deserialize(row)]));}
async function participant(client,id,lock=false){if(!/^[0-9a-f-]{36}$/i.test(id))fail(404,'participant_not_found');const r=await client.query(`SELECT * FROM participants WHERE respondent_id=$1${lock?' FOR UPDATE':''}`,[id]);if(!r.rows[0])fail(404,'participant_not_found');const p=r.rows[0];if(p.revision_id!==CONFIG.revision_id||p.wave_id!==CONFIG.wave_id)fail(409,'session_version_mismatch');return p;}
async function writeValue(client,id,name,value,page,time){
 const num=typeof value==='number'?value:null,text=value===null?null:typeof value==='object'?JSON.stringify(value):String(value);
 await client.query(`INSERT INTO responses (respondent_id,variable_name,value_text,value_num,page_id,answered_at) VALUES ($1,$2,$3,$4,$5,$6)
 ON CONFLICT (respondent_id,variable_name) DO UPDATE SET value_text=EXCLUDED.value_text,value_num=EXCLUDED.value_num,page_id=EXCLUDED.page_id,answered_at=EXCLUDED.answered_at`,[id,name,text,num,page,time]);
}
async function transaction(fn){const c=await db.pool.connect();try{await c.query('BEGIN');const result=await fn(c);await c.query('COMMIT');return result;}catch(err){await c.query('ROLLBACK');throw err;}finally{c.release();}}
function validateAnswers(page,next,input){
 if(!edges[page]?.includes(next))fail(409,'invalid_page_transition');
 if(!input||typeof input!=='object'||Array.isArray(input))fail(422,'invalid_answers');
 const allowed=pageFields[page];for(const key of Object.keys(input))if(!allowed.includes(key))fail(422,`wrong_page_variable:${key}`);
 const a=Object.fromEntries(Object.entries(input).map(([k,v])=>[k,normalize(k,v)]));
 if(page==='consent'){
  if(a.consent===null||a.consent===undefined)fail(422,'missing:consent');
  if(a.consent===0){if(next!=='screened_out')fail(409,'not_eligible');return {consent:0};}
  if(a.age===null||a.age===undefined)fail(422,'missing:age');
  // Allow under-18s to exit without answering other eligibility questions.
  if(a.age<18){if(next!=='screened_out')fail(409,'not_eligible');return a;}
  if(a.eligibility_basic===null||a.eligibility_basic===undefined)fail(422,'missing:eligibility_basic');
  const eligible=a.eligibility_basic===1;
  if(next!==(eligible?'planning':'screened_out'))fail(409,'not_eligible');return a;
 }
 for(const name of allowed){const q=byName.get(name);const optional=q?.required!=='是'&&Boolean(q);if(!optional&&(a[name]===null||a[name]===undefined))fail(422,`missing:${name}`);}
 if(page==='baseline'&&meanValid(a,brandPreNames,2)===null)fail(422,'baseline_incomplete');
 if(page==='outcomes'&&meanValid(a,brandPostNames,2)===null)fail(422,'post_incomplete');
 // Explicitly save nullable brand fields. No other missing answer is synthesized.
 if(page==='baseline')for(const n of brandPreNames)if(a[n]===undefined)a[n]=null;
 if(page==='outcomes')for(const n of brandPostNames)if(a[n]===undefined)a[n]=null;
 return a;
}
function toCsvValue(value){
 if(value===undefined||value===null)return '';
 if(typeof value==='number'&&Number.isFinite(value))return String(value); // typed numeric negatives are not formulas
 let t=value instanceof Date?value.toISOString():typeof value==='object'?JSON.stringify(value):String(value);
 if(/^[\s]*[=+\-@]/.test(t)||/^[\t\r]/.test(t))t="'"+t;
 return /[",\r\n]/.test(t)?'"'+t.replaceAll('"','""')+'"':t;
}
function csv(name,header,records){return new Response('\ufeff'+[header,...records.map(r=>header.map(k=>r[k]))].map(row=>row.map(toCsvValue).join(',')).join('\r\n'),{headers:{...securityHeaders,'content-type':'text/csv; charset=utf-8','content-disposition':`attachment; filename="${name}"`}});}
function scopeSql(request,alias=''){const current=new URL(request.url).searchParams.get('scope')==='current';const a=alias?alias+'.':'';return {where:current?` WHERE ${a}wave_id=$1 AND ${a}revision_id=$2`:'',params:current?[CONFIG.wave_id,CONFIG.revision_id]:[]};}
async function getExportData(request){
 const sc=scopeSql(request);const p=await db.pool.query('SELECT * FROM participants'+sc.where+' ORDER BY started_at',sc.params);
 const r=sc.where?await db.pool.query('SELECT r.* FROM responses r JOIN participants p ON p.respondent_id=r.respondent_id'+scopeSql(request,'p').where+' ORDER BY r.id',sc.params):await db.pool.query('SELECT * FROM responses ORDER BY id');
 return {participants:p.rows,responses:r.rows};
}
async function handle(request){
 const method=request.method.toUpperCase(),path=pathOf(request);
 if(method==='GET'&&path==='/health')return responseJson({ok:true,mode:CONFIG.mode,wave_id:CONFIG.wave_id,revision_id:CONFIG.revision_id,questionnaire_revision_id:CONFIG.questionnaire_revision_id,deployment_version:CONFIG.deployment_version,item_count:29,database_checked:false});
 if(method==='GET'&&path==='/config')return responseJson(publicConfig());
 if(method==='POST'&&path==='/session'){
  const payload=await parseJson(request),id=crypto.randomUUID(),time=now(),device=payload.device===undefined?'unknown':normalize('device',payload.device);
  await transaction(async c=>{
   await c.query(`INSERT INTO participants (respondent_id,wave_id,revision_id,base_material_id,device,user_agent,current_step,started_at,last_seen_at) VALUES ($1,$2,$3,$4,$5,NULL,'consent',$6,$6)`,[id,CONFIG.wave_id,CONFIG.revision_id,CONFIG.base_material_id,device,time]);
   const meta={questionnaire_revision_id:CONFIG.questionnaire_revision_id,ui_version:CONFIG.ui_version,deployment_version:CONFIG.deployment_version,post_material_id:CONFIG.post_material_id,stimulus_text_source_revision:CONFIG.revision_id,survey_item_count:29};
   for(const [k,v]of Object.entries(meta))await writeValue(c,id,k,v,'__system',time);
  });return responseJson({respondent_id:id,current_step:'consent',config:publicConfig()},201);
 }
 let m=path.match(/^\/session\/([^/]+)$/);
 if(method==='GET'&&m){const c=await db.pool.connect();try{const p=await participant(c,m[1]);return responseJson({respondent_id:p.respondent_id,current_step:p.current_step,randomized:Boolean(p.randomized),submitted:Boolean(p.submitted),answers:await answersOf(c,m[1]),config:publicConfig()});}finally{c.release();}}
 m=path.match(/^\/session\/([^/]+)\/page$/);
 if(method==='POST'&&m){const id=m[1],body=await parseJson(request),a=validateAnswers(body.page_id,body.next_step,body.answers);
  return transaction(async c=>{
   const p=await participant(c,id,true);
   // Network retries are accepted only with identical saved values; never overwrite a completed page.
   if(p.current_step===body.next_step && !p.submitted){const saved=await answersOf(c,id);if(Object.entries(a).every(([k,v])=>JSON.stringify(saved[k]??null)===JSON.stringify(v)))return responseJson({ok:true,next_step:p.current_step,already_saved:true});fail(409,'page_already_saved');}
   if(p.current_step!==body.page_id||p.submitted)fail(409,'invalid_page_transition');
   const time=now();for(const[k,v]of Object.entries(a))await writeValue(c,id,k,v,body.page_id,time);
   if(body.page_id==='self_pad_post')for(const d of dims)await writeValue(c,id,`self_${d}`,a[`self_${d}_post`],body.page_id,time);
   const update={current_step:body.next_step,last_seen_at:time};for(const[k,v]of Object.entries(a))if(participantColumns.has(k))update[k]=v;
   if(body.next_step==='screened_out'){update.exit_stage='screened_out';update.completed_at=time;}
   const keys=Object.keys(update);await c.query(`UPDATE participants SET ${keys.map((k,i)=>`"${k}"=$${i+1}`).join(',')} WHERE respondent_id=$${keys.length+1}`,[...keys.map(k=>update[k]),id]);
   await c.query('INSERT INTO events (respondent_id,event_type,page_id,payload_json,client_ts,server_ts) VALUES ($1,$2,$3,$4,NULL,$5)',[id,'page_saved',body.page_id,JSON.stringify({next_step:body.next_step,fields:Object.keys(a)}),time]);
   return responseJson({ok:true,next_step:body.next_step});
  });
 }
 m=path.match(/^\/session\/([^/]+)\/randomize$/);
 if(method==='POST'&&m){await parseJson(request);const id=m[1];return transaction(async c=>{
  await c.query('SELECT pg_advisory_xact_lock(hashtext($1))',[`${CONFIG.wave_id}:${CONFIG.revision_id}:randomization`]);
  const p=await participant(c,id,true);if(p.randomized)return responseJson({ok:true,already_randomized:true});
  const a=await answersOf(c,id);
  if(p.current_step!=='randomize_ready'||p.consent!==1||p.age<18||a.eligibility_basic!==1)fail(409,'not_eligible');
  if(meanValid(a,planningNames,3)===null)fail(409,'planning_incomplete');
  if(meanValid(a,brandPreNames,2)===null)fail(409,'baseline_incomplete');
  if(meanValid(a,dims.map(d=>`self_${d}_pre`),3)===null)fail(409,'self_pre_incomplete');
  if(a.post_text_loaded!==1)fail(409,'post_not_viewed');
  const counts=Object.fromEntries(CONFIG.conditions.map(g=>[g,0]));
  const rows=await c.query('SELECT condition_id,COUNT(*)::int AS n FROM participants WHERE wave_id=$1 AND revision_id=$2 AND randomized=1 GROUP BY condition_id',[CONFIG.wave_id,CONFIG.revision_id]);
  for(const r of rows.rows)if(Object.hasOwn(counts,r.condition_id))counts[r.condition_id]=Number(r.n);
  const quota=Number(CONFIG.quota_per_condition),eligible=CONFIG.conditions.filter(g=>quota<=0||counts[g]<quota);if(!eligible.length)fail(409,'quota_full');
  const condition=eligible[crypto.randomInt(eligible.length)],time=now();
  await c.query("UPDATE participants SET condition_id=$1,material_id=$2,randomized=1,randomized_at=$3,current_step='comments',last_seen_at=$3 WHERE respondent_id=$4",[condition,CONFIG.materials[condition].material_id,time,id]);
  await c.query('INSERT INTO events (respondent_id,event_type,page_id,payload_json,client_ts,server_ts) VALUES ($1,$2,$3,$4,NULL,$5)',[id,'randomized','randomize_ready',JSON.stringify({condition_id:condition,eligible_conditions:eligible,counts_before:counts,quota_per_condition:quota,allocation:'uniform_among_open_groups'}),time]);
  return responseJson({ok:true,already_randomized:false});
 });}
 m=path.match(/^\/session\/([^/]+)\/stimulus$/);
 if(method==='GET'&&m){const c=await db.pool.connect();try{
  const p=await participant(c,m[1]);if(!p.randomized)fail(409,'not_randomized');const material=CONFIG.materials[p.condition_id];
  const comments=CONFIG.commenters.map((a,i)=>({comment_id:a.id,username:a.name,avatar:a.avatar,text:material.comments[i]}));
  const hash=crypto.createHash('sha256').update(JSON.stringify(comments)).digest('hex');
  return responseJson({post_title:CONFIG.city.post_title,comments,material_id:p.material_id,stimulus_sha256:hash});
 }finally{c.release();}}
 m=path.match(/^\/session\/([^/]+)\/event$/);
 if(method==='POST'&&m){const a=await parseJson(request);if(typeof a.event_type!=='string'||!a.event_type.length||a.event_type.length>100)fail(422,'invalid_event_type');
  const c=await db.pool.connect();try{await participant(c,m[1]);await c.query('INSERT INTO events (respondent_id,event_type,page_id,payload_json,client_ts,server_ts) VALUES ($1,$2,$3,$4,$5,$6)',[m[1],a.event_type,String(a.page_id||'').slice(0,100),JSON.stringify(a.payload||{}),String(a.client_ts||'').slice(0,80),now()]);return responseJson({ok:true});}finally{c.release();}}
 m=path.match(/^\/session\/([^/]+)\/complete$/);
 if(method==='POST'&&m){await parseJson(request);return transaction(async c=>{
  const p=await participant(c,m[1],true);if(!p.randomized||!['debrief','complete'].includes(p.current_step))fail(409,'questionnaire_incomplete');
  if(p.submitted)return responseJson({ok:true,already_completed:true,duration_sec:p.duration_sec});
  const time=now(),duration=Math.max(0,Math.floor((Date.now()-new Date(p.started_at).getTime())/1000));
  await c.query("UPDATE participants SET submitted=1,complete_questionnaire=1,current_step='complete',completed_at=$1,last_seen_at=$1,exit_stage='complete',duration_sec=$2 WHERE respondent_id=$3",[time,duration,m[1]]);
  for(const[k,v]of Object.entries({submitted:1,complete_questionnaire:1,exit_stage:'complete',duration_sec:duration}))await writeValue(c,m[1],k,v,'debrief',time);
  return responseJson({ok:true,duration_sec:duration});
 });}
 if(path.startsWith('/admin/'))requireAdmin(request);
 if(method==='GET'&&path==='/admin/health'){await db.pool.query('SELECT COUNT(*) AS n FROM participants');return responseJson({ok:true,database:'reachable',revision_id:CONFIG.revision_id,questionnaire_revision_id:CONFIG.questionnaire_revision_id});}
 if(method==='GET'&&path==='/admin/summary'){
  const args=[CONFIG.wave_id,CONFIG.revision_id];
  const t=await db.pool.query("SELECT COUNT(*)::int AS created,COUNT(*) FILTER (WHERE randomized=1)::int AS randomized,COUNT(*) FILTER (WHERE submitted=1)::int AS submitted,COUNT(*) FILTER (WHERE current_step='screened_out')::int AS screened_out FROM participants WHERE wave_id=$1 AND revision_id=$2",args);
  const c=await db.pool.query('SELECT condition_id,COUNT(*)::int AS randomized,COUNT(*) FILTER (WHERE submitted=1)::int AS submitted FROM participants WHERE wave_id=$1 AND revision_id=$2 AND condition_id IS NOT NULL GROUP BY condition_id ORDER BY condition_id',args);
  const s=await db.pool.query('SELECT current_step,COUNT(*)::int AS n FROM participants WHERE wave_id=$1 AND revision_id=$2 GROUP BY current_step ORDER BY n DESC',args);
  return responseJson({wave_id:CONFIG.wave_id,revision_id:CONFIG.revision_id,questionnaire_revision_id:CONFIG.questionnaire_revision_id,quota_per_condition:CONFIG.quota_per_condition,item_count:29,totals:t.rows[0],conditions:c.rows,steps:s.rows,generated_at:now()});
 }
 if(method==='GET'&&path==='/admin/manifest')return responseJson(MANIFEST);
 if(method==='GET'&&path==='/admin/export/events.csv'){
  const sc=scopeSql(request,'p');const r=await db.pool.query('SELECT e.* FROM events e JOIN participants p ON p.respondent_id=e.respondent_id'+sc.where+' ORDER BY e.id',sc.params);
  return csv('events.csv',r.rows.length?Object.keys(r.rows[0]):['id','respondent_id','event_type','page_id','payload_json','client_ts','server_ts'],r.rows);
 }
 if(method==='GET'&&['/admin/export/participants.csv','/admin/export/responses.csv','/admin/export/wide.csv'].includes(path)){
  const{participants,responses}=await getExportData(request);
  if(path.endsWith('/participants.csv'))return csv('participants.csv',participants.length?Object.keys(participants[0]):['respondent_id','wave_id','revision_id'],participants);
  if(path.endsWith('/responses.csv'))return csv('responses_long.csv',responses.length?Object.keys(responses[0]):['id','respondent_id','variable_name','value_text','value_num','page_id','answered_at'],responses);
  const map=new Map();for(const r of responses){if(!map.has(r.respondent_id))map.set(r.respondent_id,{});map.get(r.respondent_id)[r.variable_name]=deserialize(r);}
  const pcols=participants.length?Object.keys(participants[0]):['respondent_id','wave_id','revision_id','base_material_id','condition_id','material_id','randomized','submitted'];
  const allvars=[...new Set([...rawNames,...systemNames,...legacyFields,...Object.values(pageFields).flat(),...dims.map(d=>`self_${d}`),...responses.map(r=>r.variable_name)])];
  const derivedNames=Object.keys(derivedScores({}));
  const header=[...new Set([...pcols,...systemNames,...rawNames,...allvars,...derivedNames])];
  const records=participants.map(p=>{const v=map.get(p.respondent_id)||{};return{...p,...v,...derivedScores(v,p)};});
  return csv('experiment_wide.csv',header,records);
 }
 return responseJson({detail:'not_found'},404);
}
return async request=>{if(request.method==='OPTIONS')return new Response(null,{status:204,headers:securityHeaders});try{return await handle(request);}catch(e){logger.error('api_error',e.status?e.message:e.name);return responseJson({detail:e.status?e.message:'internal_server_error'},e.status||500);}};
}

(() => {
'use strict';
const app=document.getElementById('app'),bar=document.getElementById('progressBar'),progress=document.getElementById('progressText');
const state={config:null,id:null,step:'consent',answers:{},stimulus:null,pageStartedAt:Date.now(),reachedBottom:false,timer:null,observer:null,key:null};
const flow=['consent','planning','base_intro','post_intro','baseline','comments','self_pad_post','outcomes','perceived','final_checks','debrief'];
const escapeHtml=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
const device=()=>/ipad|tablet/i.test(navigator.userAgent)?'tablet':/mobi|android|iphone/i.test(navigator.userAgent)?'mobile':'desktop';
const instruction=name=>state.config.questionnaire.instructions[name];
const q=variable=>state.config.questionnaire.questions.find(x=>x.variable===variable);
const namesFor=page=>state.config.questionnaire.pages.find(p=>p.page===page)?.items.map(n=>state.config.questionnaire.questions.find(q=>q.number===n).variable)||[];
const checked=(form,name)=>form.querySelector(`[name="${name}"]:checked`)?.value??'';
const elapsedSeconds=()=>Math.max(0,Math.floor((Date.now()-state.pageStartedAt)/1000));
function showToast(text){const t=document.getElementById('toast');t.textContent=text;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),3000);}
async function api(path,body){const r=await fetch(path,{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),credentials:'same-origin',cache:'no-store'});let data;try{data=await r.json();}catch{data={detail:'invalid_server_response'};}if(!r.ok){const e=new Error(data.detail||`HTTP_${r.status}`);e.status=r.status;throw e;}return data;}
function recordEvent(eventType,payload={},page=state.step){if(!state.id)return;void api(`/api/session/${state.id}/event`,{event_type:eventType,page_id:page,payload,client_ts:new Date().toISOString()}).catch(()=>{});}
function startPage(page){clearInterval(state.timer);state.observer?.disconnect();state.observer=null;state.step=page;state.pageStartedAt=Date.now();state.reachedBottom=false;
 const i=flow.indexOf(page),pct=page==='complete'?100:i<0?0:Math.round(100*i/flow.length);bar.style.width=pct+'%';progress.textContent=page==='complete'?'完成':pct+'%';
 window.scrollTo({top:0,behavior:'instant'});recordEvent('page_view',{viewport_w:innerWidth,viewport_h:innerHeight},page);}
function titleFor(page){return state.config.questionnaire.pages.find(p=>p.page===page)?.title||'';}
function questionHtml(item){
 const name=item.variable,required=item.required==='是',mark=required?' required':'';
 const heading=`<span class="question-number">${item.number}.</span> ${escapeHtml(item.title)}`;
 let body;
 if(item.type==='scale'){
  body=`<div class="likert-scale">${[1,2,3,4,5,6,7].map(n=>`<div class="likert-point"><input type="radio" id="${name}_${n}" name="${name}" value="${n}"${mark}><label for="${name}_${n}">${n}</label></div>`).join('')}</div>`;
  if(item.left||item.right)body+=`<div class="likert-anchors"><span>1 · ${escapeHtml(item.left)}</span><span>7 · ${escapeHtml(item.right)}</span></div>`;
 }else if(item.type==='integer'){
  body=`<input type="number" name="${name}" id="${name}" min="0" max="120" step="1" inputmode="numeric" aria-labelledby="label_${name}"${mark}>`;
 }else{
  body=`<div class="option-list">${item.options.map((o,i)=>{const label=typeof o==='string'?o:o.label,value=typeof o==='string'?o:o.value;return`<label class="option"><input type="radio" name="${name}" value="${escapeHtml(value)}"${mark}><span>${escapeHtml(label)}</span></label>`;}).join('')}</div>`;
 }
 return `<fieldset class="question-field ${item.type==='scale'?'likert':'field'}" data-question="${name}"><legend id="label_${name}" class="likert-title${required?' required':''}">${heading}</legend>${body}${item.help?`<p class="question-help">${escapeHtml(item.help)}</p>`:''}</fieldset>`;
}
const questionsHtml=vars=>vars.map(n=>questionHtml(q(n))).join('');
function formHtml(content,label='继续'){return `<form id="questionForm" novalidate>${content}<p id="formError" class="error-box" role="alert"></p><div class="actions"><button class="btn btn-primary" type="submit">${label}</button></div></form>`;}
function getAnswers(form,vars){return Object.fromEntries(vars.map(n=>{const item=q(n),str=item.type==='integer'?form.elements[n].value:checked(form,n);return [n,str===''?null:['scale','integer','single'].includes(item.type)?Number(str):str];}));}
function errorText(e){if(e.message==='quota_full')return '本轮名额已满，感谢你的参与。';if(e.message==='session_version_mismatch')return '实验版本已更新，请停止本次作答并联系研究者。';if(e.status===409)return '当前页面状态已更新，请刷新以恢复已保存的进度。';if(e.status===422)return '请检查是否已完成本页必答题，品牌形象至少回答两题。';return '保存未确认，请检查网络后重试。不要关闭页面。';}
async function savePage(page,next,answers){await api(`/api/session/${state.id}/page`,{page_id:page,next_step:next,answers});state.answers={...state.answers,...answers};recordEvent('page_submit',{elapsed_sec:elapsedSeconds(),next_step:next},page);state.step=next;await render();}
function bindForm(page,next,vars){const form=document.getElementById('questionForm');form.addEventListener('submit',async e=>{e.preventDefault();const err=document.getElementById('formError');err.textContent='';const a=getAnswers(form,vars);
 if(page==='consent'){
  if(a.consent===null){err.textContent='请选择是否同意参加。';return;}
  if(a.consent===0){await doSave(form,err,page,'screened_out',{consent:0});return;}
  if(a.age!==null&&Number.isInteger(a.age)&&a.age>=0&&a.age<18){await doSave(form,err,page,'screened_out',{consent:1,age:a.age});return;}
 }
 if(!form.reportValidity())return;
 if(page==='baseline'||page==='outcomes'){const prefix=page==='baseline'?'brand_pre':'brand_post';if([1,2,3].filter(i=>a[prefix+i]!==null).length<2){err.textContent='城市评价的三道题，请至少回答其中两题。';return;}}
 let target=next;if(page==='consent'){target=a.eligibility_basic===1?'planning':'screened_out';a.device=device();}
 await doSave(form,err,page,target,a);
 });}
async function doSave(form,err,page,next,a){const btn=form.querySelector('[type=submit]');if(btn.disabled)return;btn.disabled=true;btn.textContent='正在保存…';try{await savePage(page,next,a);}catch(e){err.textContent=errorText(e);btn.disabled=false;btn.textContent='重试保存';}}
function renderConsent(){startPage('consent');const c=instruction('consent');const info=[c.researcher_contact?`研究联系人：${c.researcher_contact}`:'',c.contact_email?`联系邮箱：${c.contact_email}`:'',c.ethics_approval?`伦理信息：${c.ethics_approval}`:''].filter(Boolean);
 app.innerHTML=`<section class="card"><h1>${escapeHtml(titleFor('consent'))}</h1><div class="consent-copy">${c.text.split('\n').map(p=>`<p>${escapeHtml(p)}</p>`).join('')}</div>${info.length?`<p class="muted">${info.map(escapeHtml).join('<br>')}</p>`:''}${formHtml(questionsHtml(namesFor('consent')))}</section>`;
 bindForm('consent','planning',namesFor('consent'));const f=document.getElementById('questionForm');f.addEventListener('change',()=>{const refused=checked(f,'consent')==='0';for(const name of ['age','eligibility_basic'])for(const el of f.querySelectorAll(`[name="${name}"]`))el.disabled=refused;});
}
function renderPlanning(){startPage('planning');app.innerHTML=`<section class="card"><h1>${escapeHtml(titleFor('planning'))}</h1><p class="muted">${escapeHtml(instruction('planning'))}</p>${formHtml(questionsHtml(namesFor('planning')))}</section>`;bindForm('planning','base_intro',namesFor('planning'));}
function renderBaseline(){startPage('baseline');const content=`<section class="question-section"><h2>你对澄湾的印象</h2><p class="muted">${escapeHtml(instruction('brand_pre'))} 三题中至少回答两题。</p>${questionsHtml(['brand_pre1','brand_pre2','brand_pre3'])}</section><section class="question-section self-section"><h2>此刻，你自己的感受</h2><p class="muted">${escapeHtml(instruction('self'))}</p>${questionsHtml(['self_P_pre','self_A_pre','self_D_pre'])}</section>`;
 app.innerHTML=`<section class="card">${formHtml(content)}</section>`;bindForm('baseline','randomize_ready',namesFor('baseline'));}
function renderSimple(page,next,instructionName){startPage(page);app.innerHTML=`<section class="card"><h1>${escapeHtml(titleFor(page))}</h1>${instructionName?`<p class="muted">${escapeHtml(instruction(instructionName))}${page==='outcomes'?' 城市评价三题中至少回答两题。':''}</p>`:''}${formHtml(questionsHtml(namesFor(page)))}</section>`;bindForm(page,next,namesFor(page));}
  function xhsIcon(name) {
    const icons = {
      heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21.2l7.8-7.8 1-1a5.5 5.5 0 0 0 0-7.8z"></path>',
      star: '<polygon points="12 2 15.1 8.3 22 9.3 17 14.2 18.2 21 12 17.7 5.8 21 7 14.2 2 9.3 8.9 8.3 12 2"></polygon>',
      comment: '<path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"></path>',
    };
    return `<svg class="xhs-icon" viewBox="0 0 24 24" aria-hidden="true">${icons[name] || icons.heart}</svg>`;
  }

  function initials(value) {
    const text = String(value || '').trim();
    return escapeHtml(text.slice(0, 2) || '旅');
  }

  function xhsImagesHtml(images, carouselId) {
    const slides = images.map((img, index) => `
      <div class="xhs-slide" data-slide-index="${index}">
        <img src="${escapeHtml(img.src)}" alt="${escapeHtml(img.alt)}" loading="eager" draggable="false">
      </div>`).join('');
    const dots = images.map((_, index) => `<span class="xhs-dot ${index === 0 ? 'active' : ''}" data-dot-index="${index}"></span>`).join('');
    return `
      <div class="xhs-media">
        <div id="${carouselId}" class="xhs-carousel" aria-label="旅行图片，可左右滑动">${slides}</div>
        <div class="xhs-counter"><span data-carousel-current>1</span>/${images.length}</div>
        <div class="xhs-dots" aria-hidden="true">${dots}</div>
      </div>`;
  }

  function attachCarousel(carouselId, pageId) {
    const carousel = document.getElementById(carouselId);
    if (!carousel) return;
    const media = carousel.closest('.xhs-media');
    const counter = media?.querySelector('[data-carousel-current]');
    const dots = [...(media?.querySelectorAll('.xhs-dot') || [])];
    const seen = new Set([0]);
    let raf = null;
    const update = () => {
      raf = null;
      const width = Math.max(1, carousel.clientWidth);
      const index = Math.max(0, Math.min(dots.length - 1, Math.round(carousel.scrollLeft / width)));
      if (counter) counter.textContent = String(index + 1);
      dots.forEach((dot, i) => dot.classList.toggle('active', i === index));
      if (!seen.has(index)) {
        seen.add(index);
        recordEvent('image_slide_view', { slide_index: index + 1 }, pageId);
      }
    };
    carousel.addEventListener('scroll', () => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    }, { passive: true });
  }

  function xhsCommentRows(comments) {
    const commentTimes = ['8分钟前', '16分钟前', '24分钟前', '38分钟前', '1小时前', '1小时前'];
    return comments.map((c, index) => `
      <div class="comment" data-comment-id="${escapeHtml(c.comment_id)}">
        <div class="comment-avatar tone-${index % 6}${c.avatar ? ' has-image' : ''}" aria-hidden="true">${c.avatar ? `<img src="${escapeHtml(c.avatar)}" alt="" loading="eager">` : initials(c.username)}</div>
        <div class="comment-main">
          <div class="comment-name">${escapeHtml(c.username)}</div>
          <div class="comment-text">${escapeHtml(c.text)}</div>
          <div class="comment-foot"><span>${commentTimes[index] || '1小时前'}</span><span>回复</span><span class="comment-like">${xhsIcon('heart')}</span></div>
        </div>
      </div>`).join('');
  }

  function xhsNoteHtml({ city, title, body, carouselId, comments = null }) {
    const tags = (city.post_tags || []).map(tag => `<span>${escapeHtml(tag)}</span>`).join('');
    const commentHtml = comments ? xhsCommentRows(comments) : '';
    return `
      <article class="xhs-note">
        <div class="xhs-author">
          <div class="xhs-avatar${city.post_avatar ? ' has-image' : ''}" aria-hidden="true">${city.post_avatar ? `<img src="${escapeHtml(city.post_avatar)}" alt="${escapeHtml(city.post_avatar_alt || '')}">` : '澄湾'}</div>
          <div class="xhs-author-main">
            <div class="xhs-account">${escapeHtml(city.post_account)}</div>
            <div class="xhs-signature">${escapeHtml(city.author_signature || '')}</div>
          </div>
          <span class="follow-chip" aria-hidden="true">关注</span>
        </div>
        ${xhsImagesHtml(city.images, carouselId)}
        <div class="xhs-content">
          <h1 class="xhs-title">${escapeHtml(title)}</h1>
          <p class="xhs-copy">${escapeHtml(body)}</p>
          <div class="xhs-tags">${tags}</div>
          <div class="xhs-meta-row">
            <span>${escapeHtml(city.post_time)}</span>
            <span class="xhs-location">${escapeHtml(city.post_location || city.name)}</span>
          </div>
        </div>
        <div class="xhs-actions" aria-label="帖子互动信息">
          <div class="xhs-input-mock">说点什么…</div>
          <span class="xhs-action">${xhsIcon('heart')}<span>${escapeHtml(city.likes)}</span></span>
          <span class="xhs-action">${xhsIcon('star')}<span>${escapeHtml(city.favorites)}</span></span>
          <span class="xhs-action">${xhsIcon('comment')}<span>${escapeHtml(city.comment_count)}</span></span>
        </div>
        ${comments ? `
          <section class="xhs-comments">
            <div class="xhs-comments-head">
              <h2 class="xhs-comments-title">${escapeHtml(city.comment_section_title || '评论区')}</h2>
              <span class="xhs-comments-count">共${escapeHtml(city.comment_count)}条评论 · 展示部分</span>
            </div>
            ${commentHtml}
            <div id="commentSentinel" class="scroll-sentinel"></div>
          </section>` : ''}
      </article>`;
  }

function attachGate(seconds,page,save){
 const btn=document.getElementById('materialNext'),label=document.getElementById('materialTimer'),sentinel=document.getElementById('materialSentinel');let saving=false;
 function update(){const remain=Math.max(0,seconds-elapsedSeconds());label.textContent=remain?`请继续阅读，${remain}秒后可继续`:state.reachedBottom?'已完成阅读要求':'请向下滚动至页面底部';btn.disabled=saving||remain>0||!state.reachedBottom;}
 state.observer=new IntersectionObserver(entries=>{if(!state.reachedBottom&&entries.some(e=>e.isIntersecting)){state.reachedBottom=true;recordEvent('scroll_bottom',{elapsed_sec:elapsedSeconds()},page);update();}},{threshold:0.5});state.observer.observe(sentinel);state.timer=setInterval(update,250);update();
 btn.addEventListener('click',async()=>{if(btn.disabled)return;saving=true;update();try{await save();}catch(e){showToast(errorText(e));saving=false;update();}});
}
const gateHtml=()=>`<section class="card material-gate"><div class="notice"><span id="materialTimer" class="timer"></span></div><div id="materialSentinel" class="scroll-sentinel"></div><div class="actions"><button type="button" id="materialNext" class="btn btn-primary" disabled>继续</button></div></section>`;
function imagesLoaded(selector){const imgs=[...document.querySelectorAll(selector)];return imgs.length>0&&imgs.every(i=>i.complete&&i.naturalWidth>0)?1:0;}
function renderBase(){startPage('base_intro');const city=state.config.city;app.innerHTML=`<article class="card city-intro-card"><h1>${escapeHtml(city.base_post_title)}</h1><p class="city-intro-copy">${escapeHtml(city.intro)}</p></article>${gateHtml()}`;
 recordEvent('base_text_loaded',{presentation:'text_only'},'base_intro');attachGate(state.config.base_min_seconds,'base_intro',()=>savePage('base_intro','post_intro',{stimulus_loaded_base:1,base_scroll_ok:state.reachedBottom?1:0,base_time_sec:elapsedSeconds()}));}
function renderPost(){startPage('post_intro');const city=state.config.city;app.innerHTML=`<section class="card"><h1>请阅读这篇旅行帖子</h1><p class="muted">请按平时浏览旅行内容的方式阅读。</p></section>${xhsNoteHtml({city,title:city.post_title,body:city.post_text,carouselId:'postCarousel'})}${gateHtml()}`;
 attachCarousel('postCarousel','post_intro');recordEvent('post_text_loaded',{presentation:'post_only_no_comments'},'post_intro');attachGate(state.config.post_min_seconds,'post_intro',()=>savePage('post_intro','baseline',{post_text_loaded:1,post_images_loaded:imagesLoaded('.xhs-note img'),post_scroll_ok:state.reachedBottom?1:0,post_time_sec:elapsedSeconds()}));}
async function renderRandomize(){startPage('randomize_ready');app.innerHTML='<section class="card"><h1>正在准备下一页</h1><p>你的作答已经保存，请稍候。</p><p id="randomizeError" class="error-box"></p><button id="randomizeRetry" class="btn btn-primary hidden">重试</button></section>';
 try{await api(`/api/session/${state.id}/randomize`,{});state.step='comments';await render();}catch(e){document.getElementById('randomizeError').textContent=errorText(e);if(e.message!=='quota_full'){const b=document.getElementById('randomizeRetry');b.classList.remove('hidden');b.addEventListener('click',renderRandomize,{once:true});}}}
async function renderComments(){startPage('comments');try{if(!state.stimulus)state.stimulus=await api(`/api/session/${state.id}/stimulus`);const s=state.stimulus;
 app.innerHTML=`<section class="card"><h1>部分评论</h1><p class="muted">${escapeHtml(state.config.city.comment_reading_prompt || '下面是这篇帖子的部分评论，请阅读后继续。')}</p></section><article class="xhs-note"><div class="comment-post-reference">原帖：${escapeHtml(s.post_title)}</div><section class="xhs-comments">${xhsCommentRows(s.comments)}</section></article>${gateHtml()}`;
 recordEvent('stimulus_loaded',{material_id:s.material_id,stimulus_sha256:s.stimulus_sha256,comment_count:s.comments.length},'comments');
 attachGate(state.config.comment_min_seconds,'comments',()=>{const a=imagesLoaded('.comment-avatar img');return savePage('comments','self_pad_post',{comment_text_loaded:document.querySelectorAll('.comment-text').length===6?1:0,comment_avatars_loaded:a,stimulus_loaded:state.answers.post_images_loaded===1&&a===1?1:0,forced_view_ok:state.reachedBottom?1:0,stimulus_time_sec:elapsedSeconds()});});
 }catch(e){app.innerHTML=`<section class="card"><h1>材料尚未加载</h1><p>${escapeHtml(errorText(e))}</p><button id="commentsRetry" class="btn btn-primary">重新加载</button></section>`;document.getElementById('commentsRetry').addEventListener('click',renderComments,{once:true});}}
function renderDebrief(){startPage('debrief');app.innerHTML=`<section class="card"><h1>研究结束说明</h1><p>${escapeHtml(state.config.debrief)}</p><p id="completeError" class="error-box"></p><div class="actions"><button id="completeBtn" class="btn btn-primary">完成提交</button></div></section>`;
 document.getElementById('completeBtn').addEventListener('click',async e=>{const b=e.currentTarget;if(b.disabled)return;b.disabled=true;try{await api(`/api/session/${state.id}/complete`,{});state.step='complete';render();}catch(err){document.getElementById('completeError').textContent=errorText(err);b.disabled=false;}});}
async function render(){switch(state.step){case'consent':renderConsent();break;case'planning':renderPlanning();break;case'base_intro':renderBase();break;case'post_intro':renderPost();break;case'baseline':renderBaseline();break;case'randomize_ready':await renderRandomize();break;case'comments':await renderComments();break;case'self_pad_post':renderSimple('self_pad_post','outcomes','self');break;case'outcomes':renderSimple('outcomes','perceived','outcomes');break;case'perceived':renderSimple('perceived','final_checks','perceived');break;case'final_checks':renderSimple('final_checks','debrief');break;case'debrief':renderDebrief();break;case'complete':startPage('complete');app.innerHTML='<section class="card"><h1>已完成提交</h1><p>感谢你的参与，作答已保存，可以关闭本页。</p></section>';break;case'screened_out':startPage('screened_out');app.innerHTML='<section class="card"><h1>感谢你的关注</h1><p>本次无需继续作答，可以关闭页面。</p></section>';break;default:throw new Error('unknown_step');}}
async function boot(){try{const config=await api('/api/config');state.config=config;state.key=`chengwan_respondent_id:${config.wave_id}:${config.revision_id}`;state.id=localStorage.getItem(state.key);
 if(state.id){try{const session=await api(`/api/session/${state.id}`);state.step=session.current_step;state.answers=session.answers||{};}catch(e){if(e.status!==404)throw e;state.id=null;localStorage.removeItem(state.key);}}
 if(!state.id){const session=await api('/api/session',{device:device()});state.id=session.respondent_id;state.step=session.current_step;localStorage.setItem(state.key,state.id);}
 await render();}catch(e){app.innerHTML=`<section class="card"><h1>暂时无法连接</h1><p>${escapeHtml(errorText(e))}</p><button id="bootRetry" class="btn btn-primary">重试连接</button></section>`;document.getElementById('bootRetry').addEventListener('click',boot,{once:true});}}
document.addEventListener('visibilitychange',()=>recordEvent(document.hidden?'visibility_hidden':'visibility_visible',{},state.step));
window.addEventListener('pagehide',()=>{if(!state.id)return;const payload={event_type:'page_hide',page_id:state.step,payload:{elapsed_sec:elapsedSeconds()},client_ts:new Date().toISOString()};navigator.sendBeacon?.(`/api/session/${state.id}/event`,new Blob([JSON.stringify(payload)],{type:'application/json'}));});
boot();
})();

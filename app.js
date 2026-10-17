const $=s=>document.querySelector(s);
const DELAY=3000;
let sections=[],activeSection=null,questions=[],index=0,timer=null,tick=null;
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function msg(t){$('#notice').textContent=t||''}
async function getJson(url){const r=await fetch(url);if(!r.ok)throw Error('تعذر تحميل البيانات');return r.json()}
function loadAnswers(){try{return JSON.parse(localStorage.getItem('omar-answers:'+activeSection)||'{}')}catch{return {}}}
function saveAnswers(a){try{localStorage.setItem('omar-answers:'+activeSection,JSON.stringify(a))}catch{}}
function clearTimers(){clearTimeout(timer);clearInterval(tick);timer=null;tick=null}
function card(s){return `<article class="card"><div>${esc(s.icon)}</div><h3>${esc(s.title)}</h3><p>${esc(s.description)} · ${s.questionCount} سؤال</p><button class="primary" data-open="${esc(s.id)}">ابدأ الحل</button></article>`}
async function loadSections(){
  try{
    sections=await getJson('data/sections.json');
    const parents=new Map();
    for(const s of sections){if(!parents.has(s.parent))parents.set(s.parent,[]);parents.get(s.parent).push(s)}
    $('#sectionGrid').innerHTML=[...parents].map(([p,items])=>{
      const subs=new Map(),direct=[];
      for(const x of items){if(x.subgroup){if(!subs.has(x.subgroup))subs.set(x.subgroup,[]);subs.get(x.subgroup).push(x)}else direct.push(x)}
      return `<section class="group"><h2>${esc(p)}</h2>${[...subs].map(([n,l])=>`<div class="subgroup"><h3>${esc(n)}</h3><div class="grid">${l.map(card).join('')}</div></div>`).join('')}${direct.length?`<div class="grid">${direct.map(card).join('')}</div>`:''}</section>`
    }).join('');
  }catch(e){msg(e.message)}
}
async function openSection(id){
  try{
    clearTimers();
    activeSection=id;
    questions=await getJson('data/'+encodeURIComponent(id)+'.json');
    const answers=loadAnswers();
    let first=questions.findIndex(q=>!answers[q.id]);
    index=first===-1?0:first;
    const s=sections.find(x=>x.id===id);
    $('#heading').textContent=s?s.title:'الأسئلة';
    $('#sectionGrid').classList.add('hidden');$('#quiz').classList.remove('hidden');$('#back').classList.remove('hidden');
    render();window.scrollTo(0,0);
  }catch(e){msg(e.message)}
}
function updateScores(){
  const vals=Object.values(loadAnswers());
  $('#scores').classList.remove('hidden');
  $('#correctCount').textContent=vals.filter(a=>a.correct).length;
  $('#wrongCount').textContent=vals.filter(a=>!a.correct).length;
}
function nav(total){
  return `<b>السؤال ${index+1} من ${total}</b><div><button class="secondary" data-nav="prev" ${index<=0?'disabled':''}>السابق</button> <label>رقم السؤال <input id="pageNum" type="number" min="1" max="${total}" value="${index+1}"></label> <button class="secondary" data-nav="goto">انتقال</button> <button class="primary" data-nav="next" ${index>=total-1?'disabled':''}>التالي</button></div>`;
}
function render(){
  clearTimers();
  updateScores();
  const total=questions.length;
  if(!total){$('#pageNav').innerHTML='';$('#questionList').innerHTML='<p>لا توجد أسئلة في هذا القسم.</p>';return}
  const q=questions[index],a=loadAnswers()[q.id];
  $('#pageNav').innerHTML=nav(total);
  $('#questionList').innerHTML=`<article class="card question"><span class="question-number">السؤال ${index+1}</span><h3>${esc(q.prompt)}</h3>${q.options.map((o,n)=>`<button class="choice ${a?(n===q.answer?'correct':n===a.choice?'wrong':''):''}" ${a?'disabled':''} data-choice="${n}">${'أبجد'[n]}. ${esc(o)}</button>`).join('')}${a?`<p class="answer ${a.correct?'good':'bad'}">${a.correct?'إجابة صحيحة':'إجابة خاطئة'}</p>`:''}<p id="countdown" class="muted"></p></article>`;
}
function finish(){
  clearTimers();
  const vals=Object.values(loadAnswers()),ok=vals.filter(a=>a.correct).length;
  $('#pageNav').innerHTML=`<b>انتهى القسم</b>`;
  $('#questionList').innerHTML=`<article class="card question"><h3>أحسنت، أنهيت جميع الأسئلة</h3><p>الإجابات الصحيحة: <b>${ok}</b> من ${questions.length}</p><button class="primary" data-act="restart">إعادة القسم من البداية</button> <button class="secondary" data-act="home">العودة إلى الأقسام</button></article>`;
}
function goNext(){
  if(index>=questions.length-1){finish();return}
  index++;render();window.scrollTo(0,0);
}
function startCountdown(){
  let left=DELAY/1000;
  const el=()=>$('#countdown');
  if(el())el().textContent=`السؤال التالي بعد ${left} ثوانٍ…`;
  tick=setInterval(()=>{left--;if(left>0&&el())el().textContent=`السؤال التالي بعد ${left} ثوانٍ…`},1000);
  timer=setTimeout(()=>{clearTimers();goNext()},DELAY);
}
$('#sectionGrid').addEventListener('click',e=>{const b=e.target.closest('[data-open]');if(b)openSection(b.dataset.open)});
$('#pageNav').addEventListener('click',e=>{
  const b=e.target.closest('[data-nav]');if(!b)return;
  const total=questions.length;
  const dest=b.dataset.nav==='prev'?index-1:b.dataset.nav==='next'?index+1:Number($('#pageNum').value)-1;
  if(Number.isInteger(dest)&&dest>=0&&dest<total){index=dest;render();window.scrollTo(0,0)}
});
$('#questionList').addEventListener('click',e=>{
  const act=e.target.closest('[data-act]');
  if(act){
    if(act.dataset.act==='restart'){try{localStorage.removeItem('omar-answers:'+activeSection)}catch{}index=0;render();window.scrollTo(0,0)}
    else $('#back').click();
    return;
  }
  const b=e.target.closest('[data-choice]');if(!b||timer)return;
  const q=questions[index],choice=Number(b.dataset.choice);
  const answers=loadAnswers();
  if(answers[q.id])return;
  answers[q.id]={choice,correct:choice===q.answer?1:0};saveAnswers(answers);
  const keepIndex=index;
  render();
  if(keepIndex===index)startCountdown();
});
$('#back').onclick=()=>{
  clearTimers();
  activeSection=null;questions=[];
  $('#quiz').classList.add('hidden');$('#sectionGrid').classList.remove('hidden');
  $('#scores').classList.add('hidden');$('#back').classList.add('hidden');$('#heading').textContent='أقسام الاختبارات';
};
loadSections();
(function(){
  const NS='omar-exams-eflc',BASE='https://api.counterapi.dev/v1/'+NS+'/';
  const fmt=n=>Number(n).toLocaleString('ar-SA');
  const safeGet=(s,k)=>{try{return s.getItem(k)}catch{return null}};
  const safeSet=(s,k,v)=>{try{s.setItem(k,v)}catch{}};
  async function hit(name,increment){
    const r=await fetch(BASE+name+(increment?'/up':''));
    if(!r.ok)throw Error('x');
    const d=await r.json();
    return d.count;
  }
  async function run(){
    try{
      const newSession=!safeGet(sessionStorage,'omar-visit-counted');
      const newVisitor=!safeGet(localStorage,'omar-visitor-counted');
      const [total,unique]=await Promise.all([hit('visits',newSession),hit('visitors',newVisitor)]);
      if(newSession)safeSet(sessionStorage,'omar-visit-counted','1');
      if(newVisitor)safeSet(localStorage,'omar-visitor-counted','1');
      document.getElementById('totalVisits').textContent=fmt(total);
      document.getElementById('uniqueVisitors').textContent=fmt(unique);
      document.getElementById('visitStats').classList.remove('hidden');
    }catch{}
  }
  run();
})();

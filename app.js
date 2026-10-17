const $=s=>document.querySelector(s);
let sections=[],activeSection=null,questions=[],page=1;
const PER_PAGE=10;
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function msg(t){$('#notice').textContent=t||''}
async function getJson(url){const r=await fetch(url);if(!r.ok)throw Error('تعذر تحميل البيانات');return r.json()}
function loadAnswers(){try{return JSON.parse(localStorage.getItem('omar-answers:'+activeSection)||'{}')}catch{return {}}}
function saveAnswers(a){try{localStorage.setItem('omar-answers:'+activeSection,JSON.stringify(a))}catch{}}
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
async function openSection(id,p=1){
  try{
    if(activeSection!==id||!questions.length){activeSection=id;questions=await getJson('data/'+encodeURIComponent(id)+'.json')}
    page=p;
    const s=sections.find(x=>x.id===id);
    $('#heading').textContent=s?s.title:'الأسئلة';
    $('#sectionGrid').classList.add('hidden');$('#quiz').classList.remove('hidden');$('#back').classList.remove('hidden');
    render();window.scrollTo(0,0);
  }catch(e){msg(e.message)}
}
function render(){
  const answers=loadAnswers(),pages=Math.max(1,Math.ceil(questions.length/PER_PAGE));
  const vals=Object.values(answers);
  $('#scores').classList.remove('hidden');
  $('#correctCount').textContent=vals.filter(a=>a.correct).length;
  $('#wrongCount').textContent=vals.filter(a=>!a.correct).length;
  $('#pageNav').innerHTML=`<b>صفحة ${page} من ${pages}</b><div><button class="secondary" data-page="prev" ${page<=1?'disabled':''}>السابق</button> <label>رقم الصفحة <input id="pageNum" type="number" min="1" max="${pages}" value="${page}"></label> <button class="secondary" data-page="goto">انتقال</button> <button class="primary" data-page="next" ${page>=pages?'disabled':''}>التالي</button></div>`;
  const start=(page-1)*PER_PAGE;
  $('#questionList').innerHTML=questions.slice(start,start+PER_PAGE).map((q,i)=>{
    const a=answers[q.id];
    return `<article class="card question"><span class="question-number">السؤال ${start+i+1}</span><h3>${esc(q.prompt)}</h3>${q.options.map((o,n)=>`<button class="choice ${a?(n===q.answer?'correct':n===a.choice?'wrong':''):''}" ${a?'disabled':''} data-question="${esc(q.id)}" data-choice="${n}">${'أبجد'[n]}. ${esc(o)}</button>`).join('')}${a?`<p class="answer ${a.correct?'good':'bad'}">${a.correct?'إجابة صحيحة':'إجابة خاطئة'}</p>`:''}</article>`
  }).join('')||'<p>لا توجد أسئلة في هذه الصفحة.</p>';
}
$('#sectionGrid').addEventListener('click',e=>{const b=e.target.closest('[data-open]');if(b)openSection(b.dataset.open)});
$('#pageNav').addEventListener('click',e=>{
  const b=e.target.closest('[data-page]');if(!b)return;
  const pages=Math.max(1,Math.ceil(questions.length/PER_PAGE));
  const dest=b.dataset.page==='prev'?page-1:b.dataset.page==='next'?page+1:Number($('#pageNum').value);
  if(Number.isInteger(dest)&&dest>=1&&dest<=pages){page=dest;render();window.scrollTo(0,0)}
});
$('#questionList').addEventListener('click',e=>{
  const b=e.target.closest('[data-question]');if(!b)return;
  const q=questions.find(x=>x.id===b.dataset.question),choice=Number(b.dataset.choice);
  if(!q)return;
  const answers=loadAnswers();
  if(!answers[q.id]){answers[q.id]={choice,correct:choice===q.answer?1:0};saveAnswers(answers)}
  render();
});
$('#back').onclick=()=>{
  activeSection=null;questions=[];
  $('#quiz').classList.add('hidden');$('#sectionGrid').classList.remove('hidden');
  $('#scores').classList.add('hidden');$('#back').classList.add('hidden');$('#heading').textContent='أقسام الاختبارات';
};
loadSections();

(function(){
'use strict';
if(window.__maomaoInterview17)return;window.__maomaoInterview17=true;
var modal=null,active=null;
function node(tag,cls,txt){var n=document.createElement(tag);if(cls)n.className=cls;if(txt!==undefined)n.textContent=txt;return n;}
function caseItem(){return window.gameState&&gameState.item;}
function caseIdx(){return Number(window.gameState&&gameState.caseIndex||0);}
function dataState(){var st=detectiveCaseState();st.interrogations=st.interrogations||{};st.interviewKeywords=st.interviewKeywords||[];st.interviewLog=st.interviewLog||[];return st;}
function save(){saveCaseProgress(caseProgress());}
function addRecord(title,body,meta,key){
 var c=caseItem(),st=dataState();if(!c)return;
 if(st.interviewLog.some(function(x){return x.key===key;}))return;
 var rec={key:key,title:title,body:body,meta:meta,at:new Date().toISOString()};st.interviewLog.push(rec);
 var log=document.getElementById('investigationLog');
 if(log){var row=node('article','investigation-entry');row.dataset.recordKind='analysis';
 row.append(node('span','record-index','问询记录 '+String(log.querySelectorAll('.investigation-entry').length+1).padStart(2,'0')),node('strong','',title),node('p','',body.length>170?body.slice(0,167)+'…':body),node('small','',meta));log.appendChild(row);}
 save();
}
function close(){if(modal){modal.remove();document.removeEventListener('keydown',esc);}modal=null;active=null;}
function esc(e){if(e.key==='Escape')close();}
function open(i){
 var c=caseItem();if(!c||!c.suspects||!c.suspects[i]||gameState.ended)return;
 close();active={i:i,c:c};var p=c.suspects[i],st=dataState(),mem=st.interrogations[i]||(st.interrogations[i]={asked:{},turns:[],memory:[]});
 gameState.interviewed[i]=true;persistDetectiveCaseState();
 var style=node('style');style.textContent='.iv17-mask{position:fixed;inset:0;z-index:10250;background:rgba(0,0,0,.65);backdrop-filter:blur(5px);display:flex;align-items:center;justify-content:center;padding:12px}.iv17-card{width:min(100%,520px);max-height:calc(100dvh - 24px);overflow:auto;background:#fff;color:#222;border:1px solid #ddd;box-shadow:0 20px 70px #0004}.iv17-head{position:sticky;top:0;background:#fff;padding:16px 17px;border-bottom:1px solid #ddd;display:flex;justify-content:space-between;gap:10px}.iv17-kicker{font-size:9px;letter-spacing:.15em;color:#888}.iv17-head h2{font:26px Georgia,serif;margin:7px 0}.iv17-close{width:35px;height:35px;background:#fff;border:1px solid #ddd;font-size:22px}.iv17-body{padding:15px 17px}.iv17-meta{font-size:10px;color:#777;margin-bottom:12px}.iv17-chat{display:grid;gap:8px}.iv17-line{background:#f5f5f2;border:1px solid #e2e2dc;padding:10px 12px;font-size:12px;line-height:1.8;white-space:pre-wrap}.iv17-line.player{background:#222;color:#fff;justify-self:end;max-width:94%}.iv17-line small{display:block;opacity:.65;font-size:9px;margin-bottom:4px}.iv17-label{font-size:10px;letter-spacing:.1em;color:#888;margin:17px 0 8px}.iv17-choices{display:grid;gap:7px}.iv17-choice{padding:11px;text-align:left;background:#fff;border:1px solid #ddd;font-size:12px;color:#222}.iv17-choice:active{background:#f1f1ed}.iv17-keywords{display:flex;flex-wrap:wrap;gap:5px}.iv17-keyword{padding:5px 7px;border:1px solid #ddd;background:#f7f7f4;font-size:9px}.iv17-note{font-size:10px;line-height:1.7;color:#888;margin-top:12px}';
 var mask=node('div','iv17-mask'),card=node('section','iv17-card'),head=node('header','iv17-head'),left=node('div',''),x=node('button','iv17-close','×');
 left.append(node('div','iv17-kicker','CASE INTERVIEW / 人物问询'),node('h2','',p.name),node('div','iv17-meta',(p.job||'相关人员')+' · 独立问询面板'));x.type='button';x.onclick=close;head.append(left,x);
 var body=node('div','iv17-body'),meta=node('div','iv17-meta','已问 '+mem.turns.length+' 次 · 记忆 '+mem.memory.length+' 条 · 线索会归入调查记录簿'),chat=node('div','iv17-chat'),label=node('div','iv17-label','选择问询方向'),choices=node('div','iv17-choices'),kwlabel=node('div','iv17-label','案件簿关键词'),keywords=node('div','iv17-keywords');
 var original=((window.CASE_INTERVIEWS||[])[caseIdx()]||[])[i];
 if(mem.turns.length)mem.turns.slice(-8).forEach(function(t){line('调查员',t.q,true);line(p.name,t.a,false);});
 else{var intro=original&&original.text||'我只会说明自己亲历的部分，具体细节还需要记录核实。';line(p.name,intro,false);addRecord('人物初次证词：'+p.name,intro,'人物问询 · '+(p.job||'相关人员'),'iv17-initial|'+c.title+'|'+i);}
 function line(who,text,player){var n=node('div','iv17-line'+(player?' player':''));n.append(node('small','',who),node('div','',text));chat.appendChild(n);}
 function drawKeywords(){keywords.innerHTML='';var list=st.interviewKeywords.filter(function(k){return k.caseTitle===c.title&&k.personIndex===i;});if(!list.length)keywords.append(node('span','iv17-note','完成追问后，关键词会出现在这里。'));list.forEach(function(k){keywords.append(node('span','iv17-keyword',k.word+' · '+k.status));});}
 function ask(q){
  var repeated=!!mem.asked[q.id],reply=q.reply;
  if(repeated)reply='你之前问过这个问题。'+reply+' 如果有新证据，我可以再根据证据补充；单纯重复提问不会改变事实。';
  mem.asked[q.id]=true;mem.turns.push({q:q.question,a:reply,id:q.id,at:new Date().toISOString()});mem.memory.push(q.memory);
  line('调查员',q.question,true);line(p.name,reply,false);
  if(!st.interviewKeywords.some(function(k){return k.caseTitle===c.title&&k.personIndex===i&&k.word===q.keyword;}))st.interviewKeywords.push({caseTitle:c.title,personIndex:i,person:p.name,word:q.keyword,status:'待核实',detail:q.detail,at:new Date().toISOString()});
  addRecord('追问记录：'+p.name+' · '+q.label,q.question+'\n'+reply,'人物问询 · '+q.memory,'iv17-turn|'+c.title+'|'+i+'|'+q.id+'|'+mem.turns.length);
  addRecord('关键词待核实：'+q.keyword,q.detail,'人物记忆 · '+p.name,'iv17-key|'+c.title+'|'+i+'|'+q.keyword);
  save();meta.textContent='已问 '+mem.turns.length+' 次 · 记忆 '+mem.memory.length+' 条';drawKeywords();render();
 }
 function render(){
  choices.innerHTML='';
  var qs=caseIdx()===0&&i===1?[
   {id:'time',label:'追问准确时间',question:'你为什么记得是晚上十点四十七分？',reply:'因为终端当时弹过一条提示。我记得时间，但我没有看清刷卡人的脸。',keyword:'异常提示',memory:'已解释时间记忆的来源',detail:'时间来自值班终端弹出的提示；提示原文仍需日志核实。'},
   {id:'alert',label:'追问异常提示',question:'当时的提示具体是什么？',reply:'我只记得提示出现了一瞬间，像是权限验证异常。具体内容要查终端日志，我不想凭印象乱说。',keyword:'权限验证异常',memory:'已说明提示内容不完整',detail:'提示可能涉及权限验证，需由终端日志核实。'},
   {id:'holder',label:'追问临时权限',question:'什么人可以使用临时通行权限？',reply:'通常需要有人申请或授权。具体谁能批准，我不负责。这类记录应该能在门禁后台查到。',keyword:'临时通行权限',memory:'已询问权限范围',detail:'临时权限需要申请或授权，申请人和批准人未知。'},
   {id:'leave',label:'追问沈闻行踪',question:'沈闻离开之前，你看见他去过门禁吗？',reply:'我不敢说他刷过卡。我当时在处理值班终端的提示，视线没有一直留在门口。',keyword:'视线存在盲区',memory:'已询问沈闻行踪',detail:'值班员的视线未持续覆盖门口，不能据此确认沈闻行动。'}
  ]:[
   {id:'detail',label:'追问具体细节',question:'请把你刚才的说法说得更具体一些。',reply:(original&&original.text||'我只能说明自己亲历的部分。')+' 具体时间和细节还需要其他记录佐证。',keyword:'补充证词',memory:'已要求补充具体细节',detail:'人物被要求补充亲历细节，仍需独立核实。'},
   {id:'time',label:'核对时间线',question:'你能确定当时的时间吗？',reply:Object.keys(gameState.revealed||{}).length?'我只能按记忆估计。现在有现场记录可以对照，我愿意再核对一次。':'我不敢给出精确时间，最好先查看现场记录，避免把记忆当成事实。',keyword:'时间待核实',memory:'已询问时间依据',detail:'人物对时间的记忆需要与现场记录核对。'},
   {id:'relation',label:'追问与沈闻的关系',question:'你和沈闻之前是否谈过这份档案？',reply:(original&&original.text||'我们有工作上的接触。')+' 我只会补充自己确实知道的部分，不猜测别人的想法。',keyword:'人物关系',memory:'已询问双方关系',detail:'记录人物与沈闻的工作接触，不将推测当作事实。'}
  ];
  qs.forEach(function(q){var b=node('button','iv17-choice',q.label+(mem.asked[q.id]?' · 已问过':''));b.type='button';b.onclick=function(){ask(q);};choices.appendChild(b);});
  var cross=node('button','iv17-choice','用已发现的证据对质');cross.type='button';cross.onclick=function(){var available=c.evidence.map(function(ev,n){return gameState.revealed&&gameState.revealed[n]?{ev:ev,n:n}:null;}).filter(Boolean);if(!available.length){alert('请先返回现场调查，查看至少一条证据。');return;}var choice=window.prompt('输入要对质的证据编号：\n'+available.map(function(v){return (v.n+1)+' · '+v.ev.title;}).join('\n'));var n=Number(choice)-1,v=available.find(function(a){return a.n===n;});if(!v){alert('没有选择有效的已发现证据。');return;}var reply='我看到了这条记录：《'+v.ev.title+'》。它需要和其他记录一起核对；单凭这一项，还不能直接认定谁在说谎。';if(caseIdx()===0&&i===1&&n===0)reply='这张门禁记录确实需要解释。我说没看清刷卡人的脸，并不等于我没看见门禁提示。记录能证明这张卡在那个时间开启了门，但还需要核对实际使用人。';mem.turns.push({q:'请解释证据：《'+v.ev.title+'》',a:reply,id:'cross'+n,at:new Date().toISOString()});mem.memory.push('已被出示证据：'+v.ev.title);line('调查员','请解释证据：《'+v.ev.title+'》',true);line(p.name,reply,false);addRecord('证据对质：'+p.name+' · '+v.ev.title,reply,'人物问询 · 已出示现场证据','iv17-cross|'+c.title+'|'+i+'|'+n+'|'+mem.turns.length);if(!st.interviewKeywords.some(function(k){return k.caseTitle===c.title&&k.personIndex===i&&k.word==='证据对质：'+v.ev.title;}))st.interviewKeywords.push({caseTitle:c.title,personIndex:i,person:p.name,word:'证据对质：'+v.ev.title,status:'待交叉核实',detail:reply,at:new Date().toISOString()});save();drawKeywords();meta.textContent='已问 '+mem.turns.length+' 次 · 记忆 '+mem.memory.length+' 条';};
  choices.appendChild(cross);
 }
 body.append(meta,chat,label,choices,kwlabel,keywords,node('div','iv17-note','每次追问都会保存到本案记录簿。人物记忆与关键词按案件和人物分别保存；未经证据核实的信息会标记为“待核实”。'));
 card.append(head,body);mask.appendChild(card);document.body.append(style,mask);modal=mask;mask.addEventListener('click',function(e){if(e.target===mask)close();});document.addEventListener('keydown',esc);drawKeywords();render();x.focus();
}
document.addEventListener('click',function(e){
 var follow=e.target&&e.target.closest?e.target.closest('[data-follow]'):null;
 if(follow){e.preventDefault();e.stopPropagation();if(e.stopImmediatePropagation)e.stopImmediatePropagation();var card=follow.closest('[data-interview]');if(card)open(Number(card.getAttribute('data-interview')));return;}
 var card=e.target&&e.target.closest?e.target.closest('[data-interview]'):null;if(!card)return;
 e.preventDefault();e.stopPropagation();if(e.stopImmediatePropagation)e.stopImmediatePropagation();open(Number(card.getAttribute('data-interview')));
},true);
var oldVersion=window.setDetectiveVersionBadge;if(typeof oldVersion==='function')window.setDetectiveVersionBadge=function(v){oldVersion(v);var b=document.getElementById('detectiveVersionBadge');if(b){b.textContent='V.17';b.setAttribute('aria-label','侦探游戏版本 V.17');}};
var badge=document.getElementById('detectiveVersionBadge');if(badge){badge.textContent='V.17';badge.setAttribute('aria-label','侦探游戏版本 V.17');}
})();
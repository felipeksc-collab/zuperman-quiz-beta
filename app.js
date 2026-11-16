'use strict';
(() => {
 const $=id=>document.getElementById(id), engine=window.QuizEngine;
 const titles=['隨堂抽考','陌生團隊','傾盆大雨','睡過頭了','關係修復','最後一週','心情低落','生活超能力','團隊極限','走廊騷動'];
 const params=new URLSearchParams(location.search);
 const testIPhoneScroll=params.get('ios-scroll')==='1'&&/iPhone|iPod/.test(navigator.userAgent);
 if(testIPhoneScroll)document.documentElement.setAttribute('data-ios-scroll-test','');
 const state={skin:'a',index:0,selected:null,answers:[],phase:'title',zoom:false};
 const pages=['title-page','quiz-page','analysis-page','result-page','upload-page'];
 const endingTvWall=new Image();
 const answerFeedbackMs=350;
 const keyPressMs=190;
 const keyMessages={
  '5':'倒帶 · 讀到上一段訊號',
  '6':'濾波 · 發現一條暗頻',
  '7':'殘響 · 電話另一頭有回音',
  '8':'卡拍 · 訊號卡在這一格',
  '9':'回旋 · 訊號倒轉',
  '*':'隱藏星頻已接通',
  '0':'未知頻道 · 回電中',
  '#':'警告 · 答題請按 1–4'
 };
 const keyTimers=new Map();
 let analysisTimer=0,resultTimer=0,ending,intro;
 let answerAdvanceTimer=null;
 let titleStartTimer=null;
 let keyMessageTimer;
 function cancelAnswerAdvance(){
  clearTimeout(answerAdvanceTimer);
  answerAdvanceTimer=null;
 }
 function phase(value){
  if(value!=='analysis'){
   clearInterval(analysisTimer);
   clearTimeout(resultTimer);
  }
  if(value!=='quiz'){
   cancelAnswerAdvance();
   clearKeyMessage();
   releasePhoneKeys();
  }
  if(value!=='title')intro?.destroy();
  if(state.phase==='upload'&&value!=='upload')ending.leaveUpload();
  state.phase=value;
  document.body.dataset.phase=value;
  pages.forEach(id=>$(id).hidden=id!==`${value}-page`);
  $('ending-stage').hidden=value!=='result'&&value!=='upload';
  resize();
 }
 function resize(){
  const root=document.documentElement;
  const toolbar=document.querySelector('.toolbar').getBoundingClientRect().height;
  root.style.setProperty('--toolbar-height',`${toolbar}px`);
  const main=$('main');
  const mainStyle=root.hasAttribute('data-iphone-browser')?getComputedStyle(main):null;
  const compactIPhone=mainStyle?.getPropertyValue('--compact-iphone').trim()==='1';
  let availableH,availableW;
  if(compactIPhone){
   const viewport=window.visualViewport;
   const height=viewport?.height>0&&Math.abs(viewport.scale-1)<.01?viewport.height:innerHeight;
   root.style.setProperty('--iphone-viewport-height',`${Math.floor(height)}px`);
   availableH=Math.max(8,Math.floor(height)-toolbar-parseFloat(mainStyle.paddingBottom));
   availableW=Math.max(9,main.clientWidth-parseFloat(mainStyle.paddingLeft)-parseFloat(mainStyle.paddingRight));
  }else{
   root.style.removeProperty('--iphone-viewport-height');
   const actionsEl=document.querySelector('.actions');const actions=state.phase==='quiz'?(getComputedStyle(actionsEl).position==='absolute'?0:actionsEl.getBoundingClientRect().height):document.body.dataset.phase==='title'?48:0;
   availableH=Math.max(250,innerHeight-toolbar-actions);
   availableW=innerWidth;
  }
  const scale=state.zoom?Math.min((availableW-8)/1079,(availableH-4)/1303):Math.min(availableW/1179,availableH/2556);
  const w=(state.zoom?1079:1179)*scale,h=(state.zoom?1303:2556)*scale;
  $('phone-holder').style.width=`${w}px`;$('phone-holder').style.height=`${h}px`;
  $('phone-artboard').style.setProperty('--phone-scale',scale);
  if(!state.zoom)$('phone-artboard').style.transform=`scale(${scale})`;else $('phone-artboard').style.removeProperty('transform');
 }
 function fit(el,min,max){
  let n=max;el.style.fontSize=`${n}px`;el.style.lineHeight=`${Math.round(n*1.18)}px`;
  while(n>min&&(el.scrollHeight>el.clientHeight+1||el.scrollWidth>el.clientWidth+1)){n--;el.style.fontSize=`${n}px`;el.style.lineHeight=`${Math.round(n*1.18)}px`;}
 }
 function render(){
  const questionIndex=state.index;
  const q=engine.questions[questionIndex];$('question-title').textContent=titles[questionIndex];$('question').textContent=q.q;
  $('progress-label').textContent=`${String(state.index+1).padStart(2,'0')} / 10`;
  const answers=$('answers');answers.replaceChildren();
  q.o.forEach((o,i)=>{
   const button=document.createElement('button');button.type='button';button.className='answer';
   button.dataset.option=i;button.setAttribute('aria-label',`${i+1} ${o[0]}`);
   Object.assign(button.style,{left:`${8+(i%2)*578}px`,top:`${472+Math.floor(i/2)*420}px`,width:'564px',height:'406px'});
   const number=document.createElement('span');number.className='answer-number';number.textContent=String(i+1).padStart(2,'0');
   const text=document.createElement('span');text.className='answer-text';text.textContent=o[0];button.append(number,text);
   button.addEventListener('click',event=>{
    chooseAnswer(i,questionIndex,event.detail===0);
   });
   answers.append(button);
  });
  $('back').disabled=state.index===0;
  $('progress-lamps').replaceChildren(...engine.questions.map((_,i)=>{const lamp=document.createElement('i');lamp.className=i<=state.index?'done':'';return lamp;}));
  updateAnswerHighlight();
  requestAnimationFrame(()=>{fit($('question'),40,48);document.querySelectorAll('.answer-text').forEach(el=>fit(el,40,46));});
 }
 function updateAnswerHighlight(){
  $('answers').querySelectorAll('.answer').forEach(button=>{
   const selected=Number(button.dataset.option)===state.selected;
   button.classList.toggle('selected',selected);
   button.setAttribute('aria-pressed',String(selected));
  });
  $('keypad').querySelectorAll('.phone-key[data-key]').forEach(button=>{
   const selected=/^[1-4]$/.test(button.dataset.key)&&Number(button.dataset.key)-1===state.selected;
   button.setAttribute('aria-pressed',String(selected));
  });
 }
 function keySound(digit){window.dispatchEvent(new CustomEvent('phone:key',{detail:{digit}}));}
 function pressPhoneKey(digit){
  const button=$('keypad').querySelector(`.phone-key[data-key="${digit}"]`);
  if(!button)return;
  clearTimeout(keyTimers.get(button));
  button.classList.add('pressed');
  keyTimers.set(button,setTimeout(()=>{
   button.classList.remove('pressed');
   keyTimers.delete(button);
  },keyPressMs));
 }
 function releasePhoneKeys(){
  for(const [button,timer] of keyTimers){
   clearTimeout(timer);
   button.classList.remove('pressed');
  }
  keyTimers.clear();
 }
 function clearKeyMessage(){
  clearTimeout(keyMessageTimer);
  delete $('screen').dataset.phoneFx;
  $('screen-footer').classList.remove('keypad-message');
  $('screen-hint').textContent='按 1–4 選擇';
 }
 function showKeyMessage(digit){
  const message=keyMessages[digit];
  if(!message)return;
  clearTimeout(keyMessageTimer);
  const screen=$('screen');
  if(screen.dataset.phoneFx===digit){
   delete screen.dataset.phoneFx;
   screen.getBoundingClientRect();
  }
  screen.dataset.phoneFx=digit;
  $('screen-footer').classList.add('keypad-message');
  $('screen-hint').textContent=message;
  keyMessageTimer=setTimeout(clearKeyMessage,1750);
 }
 function activate(digit,trusted=false){
  if(state.phase==='title'){
   if(digit==='#'&&titleStartTimer===null&&!intro?.active)selectTitleStart(trusted);
   return;
  }
  if(state.phase==='quiz'&&/^[1-4]$/.test(digit)){
   chooseAnswer(Number(digit)-1);
   return;
  }
  keySound(digit);
  if(state.phase==='result'||state.phase==='upload'){
   if(digit==='0')ending.useZero();
   return;
  }
  if(state.phase!=='quiz')return;
  pressPhoneKey(digit);
  showKeyMessage(digit);
 }
 function resetTitleStart(){
  clearTimeout(titleStartTimer);
  titleStartTimer=null;
  delete $('title-page').dataset.startStep;
 }
 function selectTitleStart(trusted){
  intro?.destroy();
  window.CashflowMusic?.start({trusted});
  const title=$('title-page');
  $('title-menu-arrow').getBoundingClientRect();
  title.dataset.startStep='start';
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  titleStartTimer=setTimeout(startQuiz,reduced?170:420);
 }
 function startQuiz(){
  resetTitleStart();
  if(!endingTvWall.src){
   endingTvWall.src='assets/ui/ending-tv-wall.png';
   endingTvWall.decode().catch(()=>{});
  }
  phase('quiz');
  render();
 }
 function chooseAnswer(option,questionIndex=state.index,focusNext=false){
  // Reject duplicates for the current question, including taps during its feedback.
  if(state.phase!=='quiz'||questionIndex!==state.index||answerAdvanceTimer!==null)return;
  clearKeyMessage();
  const digit=String(option+1);
  pressPhoneKey(digit);
  keySound(digit);
  state.answers[questionIndex]=option;
  state.selected=option;
  updateAnswerHighlight();
  answerAdvanceTimer=setTimeout(()=>{
   answerAdvanceTimer=null;
   advanceAnswer(focusNext);
  },answerFeedbackMs);
 }
 function advanceAnswer(focusNext){
  if(state.index<engine.questions.length-1){
   state.index++;
   state.selected=state.answers[state.index]??null;
   render();
   if(focusNext)$('question').focus({preventScroll:true});
   return;
  }
  const result=engine.calculate(state.answers);window.quizResult=result;
  try{sessionStorage.setItem('zuperman-quiz-result',JSON.stringify(result));}catch{}
  phase('analysis');let p=0;$('analysis-percent').textContent='0%';clearInterval(analysisTimer);
  analysisTimer=setInterval(()=>{p=Math.min(100,p+10);$('analysis-percent').textContent=`${p}%`;if(p===100){clearInterval(analysisTimer);resultTimer=setTimeout(()=>ending.show(result),180);}},150);
 }
 $('screen-zoom').addEventListener('click',()=>{state.zoom=!state.zoom;document.body.classList.toggle('screen-zoom',state.zoom);$('screen-zoom').setAttribute('aria-pressed',String(state.zoom));$('screen-zoom').textContent=state.zoom?'完整電話':'放大螢幕';resize();});
 $('start-hash').addEventListener('click',event=>{
  activate('#',event.isTrusted);
  if(testIPhoneScroll)window.scrollBy({top:96,behavior:'instant'});
 });
 $('back').addEventListener('click',()=>{
  if(state.index===0)return;
  cancelAnswerAdvance();
  state.index--;
  state.selected=state.answers[state.index]??null;
  render();
 });
 $('ending-zero').addEventListener('click',()=>activate('0'));
 // Exact chrome key bevels on both 1179 × 2556 phone assets.
 const columns=[[269,449],[474,654],[681,861]];
 const rows=[[1624,1761],[1790,1930],[1958,2098],[2127,2268]];
 const digits=['1','2','3','4','5','6','7','8','9','*','0','#'];
 const alternateKeyLabels={'*':'星號鍵，隱藏星頻','0':'0 鍵，神祕回電','#':'井字鍵'};
 const warning=document.createElement('span');
 warning.id='phone-key-warning';
 warning.textContent='⚠ 警告';
 warning.setAttribute('aria-hidden','true');
 $('screen').append(warning);
 const starSignal=document.createElement('span');
 starSignal.id='phone-star-signal';
 starSignal.setAttribute('aria-hidden','true');
 starSignal.append(document.createElement('i'));
 $('screen').append(starSignal);
 const callback=document.createElement('span');
 callback.id='phone-callback';
 callback.textContent='神祕來電';
 callback.setAttribute('aria-hidden','true');
 $('screen').append(callback);
 $('screen-hint').setAttribute('aria-live','polite');
 digits.forEach((digit,i)=>{
  const button=document.createElement('button');
  button.type='button';
  button.className='phone-key';
  button.dataset.key=digit;
  button.textContent=digit;
  button.setAttribute('aria-label',/^[1-4]$/.test(digit)?`${digit} 選擇答案 ${digit}`:alternateKeyLabels[digit]||`${digit} 音樂按鍵`);
  const [x,ex]=columns[i%3],[y,ey]=rows[Math.floor(i/3)];
  Object.assign(button.style,{left:`${x}px`,top:`${y}px`,width:`${ex-x}px`,height:`${ey-y}px`});
  button.style.setProperty('--key-slice-x',`${-x}px`);
  button.style.setProperty('--key-slice-y',`${-y}px`);
  button.addEventListener('click',()=>activate(digit));
  $('keypad').append(button);
 });
 document.addEventListener('keydown',event=>{
  if(event.altKey||event.metaKey||event.ctrlKey||event.target.matches('input,textarea,select'))return;
  if(event.repeat){
   if((event.key==='Enter'||event.key===' ')&&event.target.closest('.answer,.phone-key'))event.preventDefault();
   return;
  }
  const key=event.key==='＃'?'#':event.key;
  if(/^[0-9*#]$/.test(key)){
   event.preventDefault();
   activate(key,event.isTrusted);
  }else if(key==='Enter'&&event.target===document.body&&(state.phase==='result'||state.phase==='upload')){
   event.preventDefault();
   activate('0');
  }
 });
 addEventListener('resize',resize);document.fonts.ready.then(()=>{if(state.phase==='quiz')render();});
 window.visualViewport?.addEventListener('resize',()=>{
  if(document.documentElement.hasAttribute('data-iphone-browser')&&Math.abs(window.visualViewport.scale-1)<.01)resize();
 });
 ending=window.ZuperEnding.mount({
  showPage:phase,
  restartQuiz(){
   state.index=0;
   state.selected=null;
   state.answers=[];
   phase('quiz');
   render();
  }
 });
 phase('title');
 if(params.has('quiz'))startQuiz();
 else if(!params.has('skipintro'))intro=window.ZuperIntroPlayer?.mount($('title-page'));
 window.ZuperQuiz={getState:()=>({...state,answers:[...state.answers]}),startQuiz};
})();

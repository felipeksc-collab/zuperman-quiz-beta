'use strict';
(()=>{
const HEROES = {
  shield: {name:"守護", displayName:"守護超人", obj:"電子雞", relic:"pet", gear:"光之穹頂，永恆守護", quote:"天冷有外套，難過有我抱抱。",
    sketch:"你擁有敏銳的同理心，總是能第一時間注意到他人的需求與情緒。樂於付出與包容，是大家心中最堅實的後盾。",
    traits:[["媽系核心","star"],["守護天使","star"],["安全感滿格","star"],["照顧腦","star"]],
    sec:"barrier", colorName:"栗棕", swatch:"#6B3A24", deep:"#1E0F08", hi:"#F2DCCB", ui:"#C48A62"},
  weave:  {name:"浪漫", displayName:"浪漫超人", obj:"漫畫", relic:"manga", gear:"心象分鏡・靈感顯影", quote:"你不懂，我只想跟我的靈魂談戀愛。",
    sketch:"你習慣把生活中的喜怒哀樂轉化為屬於自己的審美與靈感，雖然偶爾會陷入自己的情緒小宇宙裡，但脆弱與感性並非缺點，而是你理解世界的獨特方式。",
    traits:[["情緒美學","star"],["感性雷達","star"],["擁抱脆弱","star"],["浪漫腦","star"]],
    sec:"verdict", colorName:"淡紫", swatch:"#96A0E8", deep:"#181B3E", hi:"#E8EBFF", ui:"#AEB7FF"},
  bolt:   {name:"叛逆", displayName:"叛逆超人", obj:"立可白", relic:"whiteout", gear:"禁令抹除・規則覆寫", quote:"我沒有不聽話，我只是比較聽我自己的話。",
    sketch:"你不畏懼權威與挑戰，習慣掌控自己的人生方向盤。充滿自信喜歡開創，雖然外表強悍、作風強烈，但內心有重情義的一面。",
    traits:[["自訂規則","star"],["破框而出","star"],["膽量不打折","star"],["開路腦","star"]],
    sec:"weave", colorName:"深紫", swatch:"#4F28A0", deep:"#140832", hi:"#E6DBFF", ui:"#A07CF5"},
  forge:  {name:"築夢", displayName:"築夢超人", obj:"自動鉛筆盒", relic:"pencil", gear:"無限續寫・夢境顯化", quote:"說夢話不算數，夢想要有進度。",
    sketch:"你懷抱著崇高的理想，習慣以超高標準要求自己，靠著一步一腳印的落地實踐精神，把夢想拉出夢中。",
    traits:[["理想主義","star"],["進度控","star"],["說到做到","star"],["落地腦","star"]],
    sec:"ascend", colorName:"粉紅", swatch:"#E891AF", deep:"#3A1222", hi:"#FFE4EE", ui:"#F7A6C3"},
  barrier:{name:"陪伴", displayName:"陪伴超人", obj:"MP3 player", relic:"mp3", gear:"頻率捕捉・結界共鳴", quote:"世界再危險沒關係，我就在這裡。",
    sketch:"你思慮周詳、警覺性高，雖然習慣防患於未然，但只要認定了夥伴與信念，你就會展現出無與倫比的忠誠與執行力，是最值得信賴的依靠。",
    traits:[["安靜堅定","star"],["忠誠系","star"],["默默守護","star"],["守候腦","star"]],
    sec:"dawn", colorName:"墨綠", swatch:"#007A3D", deep:"#021E10", hi:"#D2F6E2", ui:"#3FD58A"},
  blaze:  {name:"霸氣", displayName:"霸氣超人", obj:"Game Boy", relic:"gameboy", gear:"破陣之息・全場制霸", quote:"我不是不怕，我只是怕起來也很帥。",
    sketch:"你充滿熱情、活力與好奇心，總能用樂觀的角度轉化困境，帶領大家看見生活中無窮無盡的精彩。",
    traits:[["有事我扛","star"],["氣氛擔當","star"],["氣場全開","star"],["樂觀腦","star"]],
    sec:"bolt", colorName:"紅", swatch:"#D9121F", deep:"#300306", hi:"#FFD6D8", ui:"#FF4651"},
  verdict:{name:"理性", displayName:"理性超人", obj:"快譯通", relic:"dict", gear:"雜訊清除・真相解析", quote:"你講得很動聽，可惜少了一點邏輯。",
    sketch:"你獨立、冷靜且求知慾強，習慣退一步觀察並釐清事物的本質。你不輕易被情緒左右，喜歡透過深入的研究與邏輯思考來建構自己的認知世界。",
    traits:[["冷靜觀察","star"],["邏輯滿點","star"],["人間清醒","star"],["分析腦","star"]],
    sec:"forge", colorName:"炭黑", swatch:"#27272B", deep:"#09090B", hi:"#EEEEF2", ui:"#C8CBD6"},
  dawn:   {name:"佛系", displayName:"佛系超人", obj:"卡帶機", relic:"walkman", gear:"倒帶重啟・無我之域", quote:"在哪裡跌倒，就在哪裡躺好。",
    sketch:"你個性隨和、與世無爭，自帶一種讓人瞬間放鬆的療癒磁場。擅長游刃有餘地融入任何環境，也能隨機應變地解鎖各種技能。",
    traits:[["和平使者","star"],["百搭人格","star"],["鬆弛感拉滿","star"],["隨緣腦","star"]],
    sec:"shield", colorName:"寶藍", swatch:"#03226B", deep:"#01071C", hi:"#D2DEFF", ui:"#3F69E6"},
  ascend: {name:"衝刺", displayName:"衝刺超人", obj:"CCD 相機", relic:"camera", gear:"焦點鎖定・瞬影定格", quote:"昨天的我很強，今天的我更狂。",
    sketch:"你企圖心強，具備精準的目標導向與自我驅動力。你渴望展現價值與成果，總是全力以赴追求卓越，用不斷超越自我來贏得尊重與掌聲。",
    traits:[["進化系人格","star"],["自帶KPI","star"],["野心在線","star"],["成就腦","star"]],
    sec:"blaze", colorName:"橘", swatch:"#F28C1C", deep:"#4A2400", hi:"#FFEACC", ui:"#FFAC4A"}
};

/* ---------- Shared radar: six axes every hero is scored on (design values, order = AXES) ---------- */
const AXES = ["守護力","行動力","感染力","創造力","洞察力","意志力"];
const STATS = {
  shield:[98,78,95,68,92,84], weave:[72,66,84,98,95,70], bolt:[65,95,86,98,70,92],
  forge:[68,97,75,95,83,90], barrier:[96,80,70,66,94,88], blaze:[95,88,98,82,70,80],
  verdict:[66,70,64,78,99,88], dawn:[70,70,70,70,80,70], ascend:[66,96,73,83,78,99]
};

/* ---------- Best team: each hero's two strongest teammates (public layer: hero names only) ---------- */
const TEAM = {
  shield:[["blaze","全隊BUFF","你接住所有人的狀態，他把士氣直接拉滿，這隊很難垮。"],["ascend","放心去衝","他負責把目標往前推，你負責讓所有人安全跟上。"]],
  weave:[["forge","靈感落地","你把感受變成意想不到的點子，他負責真的把它做出來。"],["verdict","感性有解","你捕捉別人看不到的感受，他幫你把靈感整理成清楚的答案。"]],
  bolt:[["verdict","破框有理","你敢質疑規則，他負責看穿問題，讓叛逆變成新的定義。"],["barrier","放膽開路","你負責往沒人走過的地方衝，他負責提前審視風險、守住後方。"]],
  forge:[["weave","夢想具象化","他提供源源不絕的靈感，你把想像一格一格變成現實。"],["ascend","進度加速器","你負責把夢想做對，他負責把進度推到最快。"]],
  barrier:[["bolt","冒險保險栓","他敢往未知裡衝，你總能先看到風險，讓開路都在掌控之中。"],["blaze","最穩前線","他在前面扛場面，你在後面顧細節，任何狀況都有人承接。"]],
  blaze:[["shield","士氣滿血","你把全場能量拉起來，他讓每個人都被照顧到，團隊直接滿血。"],["verdict","有腦又有場","你敢出手、敢扛場，他負責判斷方向，氣勢不會用錯地方。"]],
  verdict:[["bolt","解題破局","你找到問題真正卡在哪，他直接動手把舊規則拆掉重蓋。"],["weave","左右腦合體","你負責看懂結構，他負責看見感受，答案瞬間多一個維度。"]],
  dawn:[["ascend","油門與煞車","他永遠往前衝，你讓節奏不失控，讓你從從容容游刃有餘。"],["weave","靈感緩衝區","他情緒太滿時你第一時間接住，你思緒打結時他隨時拋來新鮮靈感。"]],
  ascend:[["forge","夢想加速器","他把方向與細節設定好，你負責一路推到終點。"],["shield","最強後援","你全力追成果，他提供溫暖與情緒價值，成為你最堅固的避風港。"]]
};

/* ---------- Questions: each option = [text, primary, secondary] ---------- */
const QUESTIONS = [
  {q:"課堂上老師突然宣布要「隨堂抽考」，而且算進期末總成績！你的第一反應是？", o:[
    ["把書本高高立起來，隔絕外界干擾，照著自己的步調冷靜準備","barrier","weave"],
    ["快速掃一眼範圍，找出常考重點與邏輯破綻，抓出最省力的解題邏輯","ascend","verdict"],
    ["舉手質疑：「老師，上次沒有說要抽考，這樣合理嗎？」","forge","bolt"],
    ["看到隔壁同學慌張失措，轉頭安慰他：「別慌，等一下重點筆記分你看。」","shield","dawn"]]},
  {q:"突然被派去一個完全陌生的團隊或環境（如新公司／新班級），你的生存策略是？", o:[
    ["先保持低調觀察。摸清這裡的派系、不成文規定和真正的核心人物，再決定如何應對","verdict","barrier"],
    ["不管三七二十一，先大聲打招呼拉近距離，熱情地把大家攬成一個朋友圈","blaze","shield"],
    ["不喜歡太複雜的大圈子。傾向先找一兩個感覺最對味、頻率相同的人建立深交","barrier","weave"],
    ["「別人怎麼做是他們的事。」保持自己的風格與節奏，不刻意迎合別人的規則","weave","bolt"]]},
  {q:"沒帶傘又遇到突然傾盆大雨，你的應對方式是？", o:[
    ["果斷走進附近的超商買一把傘，不讓自己處於狼狽失控的狀態","forge","ascend"],
    ["「反正都濕了，沒差吧！」乾脆直接淋雨走回家，體驗這種難得的隨性","blaze","dawn"],
    ["看到朋友有帶傘，直接擠過去：「分我撐一下！」肩膀濕一半也覺得開心","shield","barrier"],
    ["站在騎樓下默默等待，看看雨會不會變小，或剛好有熟人經過可以順道同行","dawn","verdict"]]},
  {q:"鬧鐘完全沒響！等你醒來發現距離上班／上課只剩下極限 15 分鐘，你會？", o:[
    ["就算會遲到，也要打理好服儀、妝容與個人形象才出門，不能失了儀態","ascend","forge"],
    ["「算了，反正趕不上。」默默把被子拉回去，乾脆請假重開機，明天再來","dawn","weave"],
    ["腦袋秒速運轉，立馬生出一個邏輯嚴密、無法反駁的請假／遲到理由發給老闆或老師","verdict","ascend"],
    ["直接啟動急行軍模式！隨便抓了東西就一路狂奔，挑戰 15 分鐘壓線到達","bolt","blaze"]]},
  {q:"與關係非常好的朋友／夥伴發生嚴重爭執後，你的修復機制是？", o:[
    ["先各自冷靜，等雙方情緒都平復了，再找合適的時間心平氣和地溝通","dawn","forge"],
    ["忍受不了拖延，直接殺去找對方把話說清楚。有誤會就解決，不喜歡逃避","bolt","ascend"],
    ["自己先靜下來條列分析：「到底哪個環節出錯？誰的邏輯有問題？」理清邏輯後才開口","forge","verdict"],
    ["心裡很害怕失去這段關係，願意先主動退讓低頭，哪怕委屈自己也沒關係","barrier","shield"]]},
  {q:"面臨大考或重要專案發表的最後一週，你的備戰姿態是？", o:[
    ["列出詳細的時間規劃表，按照既定步調穩紮穩打，絕不打亂陣腳","forge","barrier"],
    ["「這個關鍵細節今天不弄懂，我絕對不睡！」刨根問底直到徹底搞懂","verdict","forge"],
    ["找夥伴一起組讀書會或討論小組，互相打氣、彼此監督，團體作戰更有動力","shield","blaze"],
    ["讀累了就去刷劇、打遊戲讓大腦放空，等靈魂充滿電後再一鼓作氣衝刺","blaze","dawn"]]},
  {q:"當你遭遇重大打擊、心情低落到快要崩潰時，你會？", o:[
    ["找最懂自己的好朋友傾訴，只要能被理解、有人陪在身邊就能重新找回力量","shield","barrier"],
    ["給自己一個儀式感（徹底大掃除、吃頓大餐或睡到自然醒），把糟糕的回憶「重置」","dawn","blaze"],
    ["躲回自己的房間戴上耳機，拉下窗簾阻絕一切聯繫，誰都不要來打擾我","weave","verdict"],
    ["把不甘心化為爆發力，暗自下定決心：「下次發表我要用成績證明自己。」","ascend","weave"]]},
  {q:"如果能獲得一種「職場／生活超能力」，你會選擇？", o:[
    ["擁有強大的氣場與庇護力，能為身邊的人擋下風雨、提供安全感","bolt","shield"],
    ["擁有直接打破僵局與常規的執行力，管他什麼死胡同，闖過去就對了","blaze","bolt"],
    ["把腦袋裡各種天馬行空的創意，瞬間落地轉化為精準實體／成果的實踐力","weave","blaze"],
    ["一眼看穿事物本質與謊言的洞察力，不被包裝或表面話術所迷惑","verdict","barrier"]]},
  {q:"當團隊集體擺爛、專案進度即將面臨慘敗的極限時刻，你會？", o:[
    ["拍幾張現場慘狀做成搞笑梗圖，或開個玩笑幽默一下，先把死氣沉沉的氣氛救起來","blaze","dawn"],
    ["不多說什麼，捲起袖子把卡住的部分一項項補上，用行動和實力把進度扛回來","forge","bolt"],
    ["溫和地提醒大家：「大家加油一下～再擺爛我們就要集體掛掉啦！」用鼓勵代替指責","dawn","shield"],
    ["不跟著抱怨，也不多管別人，安靜把自己份內的事做到最好，不讓別人的進度拖累我","ascend","verdict"]]},
  {q:"下班或放學後，空間裡只剩你一個人，走廊盡頭突然傳來奇怪的騷動聲……", o:[
    ["直接走過去一探究竟，邊走邊快速思考萬一有狀況該怎麼處理","bolt","forge"],
    ["直覺朝走廊喊一聲：「誰啊？有人在嗎？」先確認是誰、有人回應才安心","barrier","shield"],
    ["停下腳步保持安靜，仔細聆聽聲音的來源與頻率，理智評估安全性後再決定行動","verdict","ascend"],
    ["假裝沒聽到，迅速把自己的東西收一收，直接離開現場回家","weave","dawn"]]}
];

/* ---------- Scoring ---------- */
const KEYS = Object.keys(HEROES);
const EXPOSURE = {};
KEYS.forEach(k => EXPOSURE[k] = 0);
QUESTIONS.forEach(q => q.o.forEach(([, p, s]) => { EXPOSURE[p] += 2; EXPOSURE[s] += 1; }));

function topHeroes(answers){
  const pts = {}; KEYS.forEach(k => pts[k] = 0);
  answers.forEach((a, i) => { if (a == null) return; const [, p, s] = QUESTIONS[i].o[a]; pts[p] += 2; pts[s] += 1; });
  const rate = {}; KEYS.forEach(k => rate[k] = pts[k] / EXPOSURE[k]);
  const EPS = 1e-9;
  const top = Math.max(...KEYS.map(k => rate[k]));
  let tied = KEYS.filter(k => Math.abs(rate[k] - top) < EPS);
  if (tied.length > 1) {
    const sTop = Math.max(...tied.map(k => rate[HEROES[k].sec]));
    tied = tied.filter(k => Math.abs(rate[HEROES[k].sec] - sTop) < EPS);
  }
  return tied;
}
function score(answers){
  const tied = topHeroes(answers);
  return tied[Math.floor(Math.random() * tied.length)];
}

function calculate(answers,random=Math.random){
 if(!Array.isArray(answers)||answers.length!==QUESTIONS.length||answers.some(x=>!Number.isInteger(x)||x<0||x>3))throw new Error('需要完整十題答案，每題為0至3');
 const points=Object.fromEntries(KEYS.map(k=>[k,0]));
 answers.forEach((a,i)=>{const [,p,s]=QUESTIONS[i].o[a];points[p]+=2;points[s]+=1;});
 const rates=Object.fromEntries(KEYS.map(k=>[k,points[k]/EXPOSURE[k]]));
 const tied=topHeroes(answers),r=random();
 if(!Number.isFinite(r)||r<0||r>=1)throw new Error('亂數必須介於0與1之間');
 const heroKey=tied[Math.floor(r*tied.length)];
 const team=TEAM[heroKey].map(([id,label,description])=>({name:HEROES[id].displayName,label,description}));
 return {heroKey,hero:HEROES[heroKey],team,axes:AXES,stats:STATS[heroKey],points,rates,tied,answers:[...answers],rulesVersion:'existing-integrated-1110'};
}
const api={questions:QUESTIONS,heroes:HEROES,axes:AXES,stats:STATS,exposure:EXPOSURE,calculate,topHeroes};
if(typeof module!=='undefined')module.exports=api;else window.QuizEngine=api;

})();

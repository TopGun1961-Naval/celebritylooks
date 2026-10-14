/* CelebrityLooks.com shared script. Every page is prerendered HTML; this file adds the interactive parts:
   theme, menu, search, listing filters, ads (same modes as BabyNamePopularity), video pre-roll and docking,
   email sign-up and the exit prompt. Ad settings live in /ads-config.js (window.CL_ADS). */
(function(){
"use strict";
function $(s,r){ return (r||document).querySelector(s); }
function $$(s,r){ return [].slice.call((r||document).querySelectorAll(s)); }
function esc(s){ return String(s==null?"":s).replace(/[&<>"']/g,function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]; }); }
var ROOT=document.documentElement.getAttribute("data-root")||"/";

/* photos that fail to load (blocked or offline) fall back to the tinted frame instead of a broken-image icon */
$$(".ph img, .lc-prod img, .pimg img, .mono img").forEach(function(im){ function f(){ var p=im.closest(".lc-prod"); if(p) p.style.display="none"; else im.style.visibility="hidden"; } im.addEventListener("error",f); if(im.complete&&!im.naturalWidth&&im.loading!=="lazy"&&im.currentSrc) f(); });

/* ---------- theme ---------- */
var tb=$("#theme");
if(tb) tb.onclick=function(){ var cur=document.documentElement.getAttribute("data-theme");
  var dark=cur? cur==="dark" : matchMedia("(prefers-color-scheme: dark)").matches;
  var next=dark?"light":"dark"; document.documentElement.setAttribute("data-theme",next);
  try{ localStorage.setItem("cl-theme",next); }catch(e){} };

/* ---------- menu ---------- */
var mb=$("#menu"), nav=$("#nav");
if(mb&&nav) mb.onclick=function(){ var o=nav.classList.toggle("open"); mb.setAttribute("aria-expanded",o); };

/* ---------- search ---------- */
var IDX=null;
function loadIdx(cb){ if(IDX) return cb(IDX); fetch(ROOT+"search-index.json").then(function(r){ return r.json(); }).then(function(d){ IDX=d; cb(d); }).catch(function(){ IDX=[]; cb(IDX); }); }
function norm(s){ return String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,""); }
function find(q,d,n){ q=norm(q).trim(); if(!q) return []; var words=q.split(/\s+/);
  return d.map(function(x){ var t=norm(x.t+" "+(x.k||"")); var s=0; words.forEach(function(w){ if(t.indexOf(w)<0) s=-1e9; else if(norm(x.t).indexOf(w)===0) s+=3; else s+=1; }); if(x.y==="Celebrity") s+=1; return [s,x]; })
   .filter(function(a){ return a[0]>0; }).sort(function(a,b){ return b[0]-a[0]; }).slice(0,n||8).map(function(a){ return a[1]; }); }
function bindSearch(input){
  var box=document.createElement("div"); box.className="ac"; box.hidden=true; input.parentNode.appendChild(box); var on=-1;
  input.addEventListener("focus",function(){ loadIdx(function(){}); });
  input.addEventListener("input",function(){ loadIdx(function(d){ var r=find(input.value,d,8); on=-1;
    box.innerHTML=r.map(function(x){ return '<a href="'+ROOT+x.u+'"><span>'+esc(x.t)+'</span><small>'+esc(x.y)+'</small></a>'; }).join("");
    box.hidden=!r.length; }); });
  input.addEventListener("keydown",function(e){ var as=$$("a",box); if(e.key==="ArrowDown"||e.key==="ArrowUp"){ e.preventDefault(); if(!as.length) return; on=(on+(e.key==="ArrowDown"?1:-1)+as.length)%as.length; as.forEach(function(a,i){ a.classList.toggle("on",i===on); }); }
    else if(e.key==="Escape"){ box.hidden=true; } });
  input.form&&input.form.addEventListener("submit",function(e){ e.preventDefault(); var as=$$("a",box); if(on>-1&&as[on]) location.href=as[on].href; else location.href=ROOT+"search/?q="+encodeURIComponent(input.value); });
  document.addEventListener("click",function(e){ if(!input.parentNode.contains(e.target)) box.hidden=true; });
}
$$(".js-search").forEach(bindSearch);
var sb=$("#search-btn"), hs=$("#hdr-search");
if(sb&&hs) sb.onclick=function(){ hs.hidden=!hs.hidden; sb.setAttribute("aria-expanded",!hs.hidden); if(!hs.hidden) $("input",hs).focus(); };
var sres=$("#search-results");
if(sres){ var q=new URLSearchParams(location.search).get("q")||""; var si=$("#q-page"); if(si) si.value=q;
  loadIdx(function(d){ var r=find(q,d,60);
    sres.innerHTML=q? (r.length? '<p class="kicker" style="margin-bottom:12px">'+r.length+' results for “'+esc(q)+'”</p><div class="news-list">'+r.map(function(x){ return '<div class="nitem"><time>'+esc(x.y)+'</time><div><h3><a href="'+ROOT+x.u+'">'+esc(x.t)+'</a></h3>'+(x.d?'<p>'+esc(x.d)+'</p>':"")+'</div></div>'; }).join("")+'</div>' : '<div class="empty">No looks match “'+esc(q)+'” yet. Try a celebrity, designer, event or item such as “gown”.</div>') : ""; }); }

/* ---------- listing filters (cards carry data-* attributes) ---------- */
$$("[data-filter-for]").forEach(function(f){
  var grid=document.getElementById(f.getAttribute("data-filter-for")), count=$(".count",f), empty=$(".empty",grid.parentNode);
  function apply(){ var sel={}; $$("select",f).forEach(function(s){ if(s.value) sel[s.name]=s.value; });
    var n=0; $$("[data-look]",grid).forEach(function(c){ var ok=true; for(var k in sel){ var v=(c.getAttribute("data-"+k)||"").split(" "); if(v.indexOf(sel[k])<0) ok=false; } c.hidden=!ok; if(ok) n++; });
    if(count) count.textContent=n+(n===1?" look":" looks"); if(empty) empty.hidden=n>0;
    var qs=new URLSearchParams(sel).toString(); history.replaceState(null,"",location.pathname+(qs?"?"+qs:"")); }
  var p=new URLSearchParams(location.search); $$("select",f).forEach(function(s){ if(p.get(s.name)) s.value=p.get(s.name); s.onchange=apply; });
  apply(); });

/* ---------- email sign-up ---------- */
function wireForms(root){
  $$(".js-form",root).forEach(function(f){ if(f.dataset.w) return; f.dataset.w=1; f.addEventListener("submit",function(ev){ ev.preventDefault(); var inp=$("input[type=email]",f), ok=$(".ok-msg",f);
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inp.value)){ ok.hidden=false; ok.textContent="Enter an email address like name@example.com."; return; }
    var ep=(window.CL_ADS||{}).newsletterEndpoint;
    if(ep){ var body=new FormData(); body.append("email",inp.value); body.append("list",f.getAttribute("data-list")||"weekly"); fetch(ep,{method:"POST",body:body,mode:"no-cors"}).catch(function(){}); ok.hidden=false; ok.textContent="You’re in. Check your inbox to confirm."; }
    else { ok.hidden=false; ok.textContent="Thanks! The newsletter opens at launch; sign-ups aren’t being saved yet."; }
    inp.value=""; try{ localStorage.setItem("cl-joined","1"); }catch(e){} }); });
}
wireForms();

/* exit prompt: desktop only, once per visitor, never for subscribers */
(function(){ var seen=false; try{ seen=localStorage.getItem("cl-joined")||sessionStorage.getItem("cl-exit"); }catch(e){}
  if(seen||window.innerWidth<1000||!$("main[data-exit]")) return;
  document.addEventListener("mouseout",function h(e){ if(e.relatedTarget||e.clientY>8) return; document.removeEventListener("mouseout",h);
    try{ sessionStorage.setItem("cl-exit","1"); }catch(x){}
    var m=document.createElement("div"); m.className="modal"; m.setAttribute("role","dialog"); m.setAttribute("aria-modal","true"); m.setAttribute("aria-labelledby","exit-h");
    m.innerHTML='<div class="modal-box"><button type="button" class="modal-x" aria-label="Close">×</button><span class="eyebrow">Free every Friday</span><h2 id="exit-h">The week’s best looks, for less</h2><p>Five celebrity looks, who made them, and three similar styles at lower prices. One email a week.</p><form class="js-form" data-list="exit" novalidate><label class="sr" for="exit-e">Email address</label><input id="exit-e" type="email" placeholder="Your email address" required><button class="btn btn-brand" type="submit">Sign up</button><p class="ok-msg" hidden></p></form></div>';
    document.body.appendChild(m); wireForms(m); $("input",m).focus();
    function close(){ m.remove(); } $(".modal-x",m).onclick=close; m.onclick=function(ev){ if(ev.target===m) close(); }; document.addEventListener("keydown",function(ev){ if(ev.key==="Escape") close(); });
  }); })();

/* ---------- ads ---------- */
var ADS=(function(){ var d={mode:"house",adsenseClient:"",adsenseSlots:{leader:"",inc:"",rect:"",anchor:""},gam:{network:"",units:{leader:"",inc:"",rect:"",anchor:""}},managedScript:"",videoAdTag:"",maxInContent:3};
  var o=window.CL_ADS||{}; for(var k in o) d[k]=o[k]; return d; })();
var AD_SIZES={leader:["728×90 leaderboard","320×50 mobile banner"],inc:["Responsive in-content ad","300×250 on phones"],rect:["300×250 medium rectangle","300×250"],anchor:["728×90 sticky footer","320×50 sticky footer"]};
var HOUSE=window.CL_HOUSE||[];
var houseI=Math.floor(Math.random()*7);
function houseAd(type){ if(!HOUSE.length) return ""; var x=HOUSE[(houseI++)%HOUSE.length];
  if(type==="leader"||type==="anchor") return '<a class="house house-l" href="'+ROOT+x.h+'"><span class="house-t">'+esc(x.t)+'</span><span class="house-b">'+esc(x.b)+' →</span></a>';
  return '<a class="house house-r" href="'+ROOT+x.h+'">'+(x.img?'<span class="ph"><img src="'+x.img+'" alt="" loading="lazy" decoding="async"></span>':"")+'<span class="house-c"><span class="house-t">'+esc(x.t)+'</span><span class="house-s">'+esc(x.s)+'</span><span class="btn btn-sm btn-brand">'+esc(x.b)+'</span></span></a>'; }
var adScriptLoaded=false;
function loadScript(src,attrs){ var s=document.createElement("script"); s.async=true; s.src=src; if(attrs) for(var k in attrs) s.setAttribute(k,attrs[k]); document.head.appendChild(s); return s; }
function fillAds(root){
  var mode=ADS.mode;
  $$("[data-ad]",root).forEach(function(el){ if(el.dataset.filled) return; el.dataset.filled="1"; var type=el.dataset.ad, box=$(".ad-box",el);
    if(mode==="off"){ el.hidden=true; return; }
    if(mode==="preview"){ var z=AD_SIZES[type]||["Ad",""]; box.innerHTML='<div class="ad-prev"><b>Ad space</b><span>'+(window.innerWidth<760?z[1]:z[0])+'</span><small>Filled by the ad network after approval</small></div>'; return; }
    if(mode==="house"){ $(".ad-lbl",el).textContent="From CelebrityLooks"; box.innerHTML=houseAd(type); return; }
    if(mode==="adsense"&&ADS.adsenseClient){
      if(!adScriptLoaded){ loadScript("https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client="+ADS.adsenseClient,{crossorigin:"anonymous"}); adScriptLoaded=true; }
      var slot=ADS.adsenseSlots[type]; if(!slot){ el.hidden=true; return; }
      box.innerHTML='<ins class="adsbygoogle" style="display:block" data-ad-client="'+ADS.adsenseClient+'" data-ad-slot="'+slot+'"'+(type==="anchor"?' data-ad-format="horizontal"':' data-ad-format="auto" data-full-width-responsive="true"')+'></ins>';
      try{ (window.adsbygoogle=window.adsbygoogle||[]).push({}); }catch(e){}
      return; }
    if(mode==="gam"&&ADS.gam.network){
      window.googletag=window.googletag||{cmd:[]};
      if(!adScriptLoaded){ loadScript("https://securepubads.g.doubleclick.net/tag/js/gpt.js"); adScriptLoaded=true;
        googletag.cmd.push(function(){ googletag.pubads().enableSingleRequest(); googletag.pubads().collapseEmptyDivs(); googletag.enableServices(); }); }
      var unit=ADS.gam.units[type]; if(!unit){ el.hidden=true; return; }
      var sizes={leader:[[728,90],[320,50]],inc:[[300,250],[336,280],"fluid"],rect:[[300,250]],anchor:[[728,90],[320,50]]}[type];
      box.id=el.id+"-g";
      googletag.cmd.push(function(){ var sl=googletag.defineSlot(ADS.gam.network+"/"+unit,sizes,box.id); if(sl){ sl.addService(googletag.pubads()); googletag.display(box.id); } });
      return; }
    if(mode==="managed"){ if(!adScriptLoaded&&ADS.managedScript){ loadScript(ADS.managedScript); adScriptLoaded=true; } el.classList.add("ad-managed"); return; }
    el.hidden=true;
  });
}
/* in-content slots are prerendered in the page; drop any beyond the configured maximum */
$$('[data-ad="inc"]').forEach(function(el,i){ if(i>=ADS.maxInContent) el.parentNode.removeChild(el); });
fillAds(document);
(function initAnchor(){
  if(ADS.mode==="off"||ADS.mode==="managed"||$("main[data-noanchor]")) return;
  try{ if(sessionStorage.getItem("cl-anchor-x")) return; }catch(e){}
  var a=document.createElement("div"); a.className="ad-anchor-wrap"; a.innerHTML='<aside class="ad ad-anchor" data-ad="anchor" id="ad-anchor-1" aria-label="Advertisement"><span class="ad-lbl">Advertisement</span><div class="ad-box"></div></aside><button type="button" class="ad-x" aria-label="Close ad">×</button>';
  document.body.appendChild(a); document.body.classList.add("has-anchor"); fillAds(a);
  $(".ad-x",a).onclick=function(){ a.remove(); document.body.classList.remove("has-anchor"); try{ sessionStorage.setItem("cl-anchor-x","1"); }catch(e){} };
})();

/* ---------- video ---------- */
var imaLoaded=null;
function loadIMA(cb){ if(window.google&&google.ima) return cb(); if(!imaLoaded){ imaLoaded=[]; var s=loadScript("https://imasdk.googleapis.com/js/sdkloader/ima3.js"); s.onload=function(){ imaLoaded.forEach(function(f){ f(); }); }; s.onerror=function(){ imaLoaded.forEach(function(f){ f(true); }); }; } imaLoaded.push(cb); }
function prerollPreview(fig,done){
  var ad=$(".vp-ad",fig); ad.hidden=false; var n=5;
  ad.innerHTML='<div class="vp-ad-prev"><b>Pre-roll video ad plays here</b><span>A 15–30 second ad from the video ad network, before the video starts</span><button type="button" class="btn btn-sm">Skip preview <span class="vp-n">'+n+'</span></button></div>';
  var tm=setInterval(function(){ n--; var e=$(".vp-n",ad); if(e) e.textContent=n; if(n<=0) fin(); },1000);
  function fin(){ clearInterval(tm); ad.hidden=true; ad.innerHTML=""; done(); }
  $("button",ad).onclick=fin;
}
function prerollIMA(fig,video,done){
  var ad=$(".vp-ad",fig); ad.hidden=false; ad.innerHTML="";
  loadIMA(function(err){ if(err||!window.google||!google.ima){ ad.hidden=true; return done(); }
    try{
      var adc=new google.ima.AdDisplayContainer(ad,video); adc.initialize();
      var loader=new google.ima.AdsLoader(adc), mgr=null, finished=false;
      function fin(){ if(finished) return; finished=true; ad.hidden=true; try{ mgr&&mgr.destroy(); }catch(e){} done(); }
      loader.addEventListener(google.ima.AdsManagerLoadedEvent.Type.ADS_MANAGER_LOADED,function(e){
        mgr=e.getAdsManager(video);
        mgr.addEventListener(google.ima.AdErrorEvent.Type.AD_ERROR,fin);
        mgr.addEventListener(google.ima.AdEvent.Type.CONTENT_RESUME_REQUESTED,fin);
        mgr.addEventListener(google.ima.AdEvent.Type.ALL_ADS_COMPLETED,fin);
        try{ var r=ad.getBoundingClientRect(); mgr.init(r.width,r.height,google.ima.ViewMode.NORMAL); mgr.start(); }catch(x){ fin(); } });
      loader.addEventListener(google.ima.AdErrorEvent.Type.AD_ERROR,fin);
      var req=new google.ima.AdsRequest(); req.adTagUrl=ADS.videoAdTag.replace("[CORRELATOR]",Date.now()).replace("[URL]",encodeURIComponent(location.href));
      var r2=ad.getBoundingClientRect(); req.linearAdSlotWidth=r2.width; req.linearAdSlotHeight=r2.height; req.nonLinearAdSlotWidth=r2.width; req.nonLinearAdSlotHeight=r2.height/3;
      loader.requestAds(req); setTimeout(function(){ if(!mgr) fin(); },8000);
    }catch(e){ ad.hidden=true; done(); }
  });
}
$$(".vp").forEach(function(fig){
  var video=$("video",fig), start=$(".vp-start",fig), x=$(".vp-x",fig), began=false;
  function play(){ start.hidden=true; video.play().catch(function(){}); }
  start.onclick=function(){ if(began) return play(); began=true; start.hidden=true;
    $$("video").forEach(function(o){ if(o!==video) o.pause(); });
    if(ADS.mode==="preview") prerollPreview(fig,play);
    else if((ADS.mode==="gam"||ADS.mode==="adsense")&&ADS.videoAdTag) prerollIMA(fig,video,play);
    else play(); };
  video.addEventListener("play",function(){ began=true; start.hidden=true; });
  if(fig.classList.contains("vp-dockable")&&"IntersectionObserver" in window){
    new IntersectionObserver(function(es){ es.forEach(function(e){ var playing=!video.paused&&!video.ended;
      if(!e.isIntersecting&&playing&&window.innerWidth>=760&&!fig.dataset.nodock){ fig.style.setProperty("--vp-h",fig.offsetHeight+"px"); fig.classList.add("docked"); x.hidden=false; }
      else if(e.isIntersecting){ fig.classList.remove("docked"); x.hidden=true; } }); },{threshold:0}).observe(fig);
    x.onclick=function(){ fig.dataset.nodock="1"; fig.classList.remove("docked"); x.hidden=true; video.pause(); };
  }
});
$$("[data-seek]").forEach(function(b){ b.onclick=function(){ var v=$(".vp video"), st=$(".vp .vp-start"); if(!v) return; v.currentTime=+b.dataset.seek; if(st) st.hidden=true; v.play().catch(function(){}); window.scrollTo({top:$(".vp").getBoundingClientRect().top+window.scrollY-90}); }; });
})();
/* Saved looks (kept in this browser) and copy-link buttons */
(function(){
var KEY="cl-saved", ROOT=document.documentElement.getAttribute("data-root")||"/";
function load(){ try{ return JSON.parse(localStorage.getItem(KEY)||"[]"); }catch(e){ return []; } }
function store(a){ try{ localStorage.setItem(KEY,JSON.stringify(a)); }catch(e){} }
function href(slug){ return ROOT+"looks/"+slug+"/"+(ROOT.charAt(0)==="/"?"":"index.html"); }
function esc(s){ return String(s).replace(/[&<>"]/g,function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]; }); }
Array.prototype.forEach.call(document.querySelectorAll("[data-save]"),function(b){
  var slug=b.getAttribute("data-save"), lbl=b.querySelector("span");
  function sync(){ var on=load().some(function(x){ return x.s===slug; }); b.setAttribute("aria-pressed",on?"true":"false"); if(lbl) lbl.textContent=on?"Saved":"Save look"; }
  b.addEventListener("click",function(){ var a=load(), on=a.some(function(x){ return x.s===slug; });
    a=on? a.filter(function(x){ return x.s!==slug; }) : [{s:slug,t:b.getAttribute("data-title"),d:new Date().toISOString().slice(0,10)}].concat(a); store(a); sync(); });
  sync();
});
var list=document.getElementById("saved-list");
if(list){ var a=load(), empty=document.getElementById("saved-empty");
  if(a.length){ empty.hidden=true; list.innerHTML=a.map(function(x){ return '<div class="nitem"><time>Saved '+esc(x.d||"")+'</time><div><h3><a href="'+href(x.s)+'">'+esc(x.t)+'</a></h3><p><button type="button" class="linkbtn" data-unsave="'+esc(x.s)+'">Remove</button></p></div></div>'; }).join("");
    list.addEventListener("click",function(e){ var s=e.target.getAttribute&&e.target.getAttribute("data-unsave"); if(!s) return; store(load().filter(function(x){ return x.s!==s; })); e.target.closest(".nitem").remove(); if(!load().length) empty.hidden=false; }); } }
Array.prototype.forEach.call(document.querySelectorAll("[data-copy]"),function(b){
  b.addEventListener("click",function(){ var u=b.getAttribute("data-copy"), done=function(){ b.textContent="Link copied"; setTimeout(function(){ b.textContent="Copy link"; },2000); };
    if(navigator.clipboard) navigator.clipboard.writeText(u).then(done,function(){ prompt("Copy this link:",u); }); else prompt("Copy this link:",u); });
});
})();

import { db } from "./firebase-config.js";
import { initCookieConsent } from "./consent.js";
import { collection, getDocs, limit, orderBy, query, Timestamp, where } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

const counties=["Baringo","Bomet","Bungoma","Busia","Elgeyo-Marakwet","Embu","Garissa","Homa Bay","Isiolo","Kajiado","Kakamega","Kericho","Kiambu","Kilifi","Kirinyaga","Kisii","Kisumu","Kitui","Kwale","Laikipia","Lamu","Machakos","Makueni","Mandera","Marsabit","Meru","Migori","Mombasa","Murang'a","Nairobi","Nakuru","Nandi","Narok","Nyamira","Nyandarua","Nyeri","Samburu","Siaya","Taita-Taveta","Tana River","Tharaka-Nithi","Trans Nzoia","Turkana","Uasin Gishu","Vihiga","Wajir","West Pokot"];
const menuToggle=document.getElementById('menuToggle'),mainNav=document.getElementById('mainNav');
menuToggle?.addEventListener('click',()=>{const open=mainNav.classList.toggle('open');menuToggle.setAttribute('aria-expanded',String(open));menuToggle.setAttribute('aria-label',open?'Close navigation':'Open navigation')});
mainNav?.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{mainNav.classList.remove('open');menuToggle?.setAttribute('aria-expanded','false')}));
const year=document.getElementById('year');if(year)year.textContent=new Date().getFullYear();
initCookieConsent();
const countyGrid=document.getElementById('countyGrid');
if(countyGrid){countyGrid.innerHTML=counties.map(c=>'<button class="county-chip" type="button" data-county="'+c.replaceAll('"','&quot;')+'">'+c+'</button>').join('');countyGrid.addEventListener('click',e=>{const b=e.target.closest('[data-county]');if(!b)return;document.getElementById('countyFilter').value=b.dataset.county;document.getElementById('discover')?.scrollIntoView({behavior:'smooth'});document.getElementById('searchForm')?.requestSubmit()});}
const grid=document.getElementById('listingGrid'),feedStatus=document.getElementById('liveFeedStatus');
let liveListings=[];
function money(value){return new Intl.NumberFormat('en-KE',{style:'currency',currency:'KES',maximumFractionDigits:0}).format(Number(value)||0);}
function tierRank(tier){return ({premium:0,standard:1,basic:2})[String(tier||'basic').toLowerCase()]??2;}
function makeCard(item){
  const card=document.createElement('article');card.className='property-card live-property-card reveal';
  const photo=document.createElement('div');photo.className='property-photo photo-one live-photo';
  const firstImage=(item.media||[]).find(m=>m.kind==='image'&&m.url)?.url||(item.photoUrls||[])[0];
  if(firstImage){const img=document.createElement('img');img.src=firstImage;img.alt=item.title||'SkyNest advert';img.loading='lazy';photo.append(img);}
  else photo.classList.add('photo-fallback');
  const tier=String(item.advertiserTier||'basic').toLowerCase();
  if(tier!=='basic'){const tierTag=document.createElement('span');tierTag.className='tier-tag tier-'+tier;tierTag.textContent=tier.toUpperCase();photo.append(tierTag);}
  const tag=document.createElement('span');tag.className='photo-tag';tag.textContent='APPROVED ADVERT';photo.append(tag);
  if((item.media||[]).some(m=>m.kind==='video')){const video=document.createElement('span');video.className='video-tag';video.textContent='▶ VIDEO TOUR';photo.append(video);}
  const info=document.createElement('div');info.className='property-info';
  const meta=document.createElement('div');meta.className='property-meta';meta.textContent=(item.category||'ADVERT')+' · '+(item.county||'KENYA');
  const title=document.createElement('h3');title.textContent=item.title||'SkyNest listing';
  const desc=document.createElement('p');desc.textContent=(item.town||'')+(item.estate?' · '+item.estate:'')+' — '+(item.description||'');
  const bottom=document.createElement('div');bottom.className='property-bottom';
  const price=document.createElement('strong');price.textContent=money(item.price)+(item.advertType==='For rent'?' / month':'');
  const contact=document.createElement('a');contact.className='round-arrow';contact.textContent='Contact ↗';contact.href='tel:'+String(item.contactPhone||'').replace(/[^+0-9]/g,'');contact.setAttribute('aria-label','Call advertiser');
  bottom.append(price,contact);info.append(meta,title,desc,bottom);card.append(photo,info);return card;
}
function applyFilters(){
  if(!grid)return;
  const county=document.getElementById('countyFilter')?.value||'all';
  const type=document.getElementById('typeFilter')?.value||'all';
  const location=(document.getElementById('locationFilter')?.value||'').trim().toLowerCase();
  const budget=document.getElementById('budgetFilter')?.value||'all';
  const matches=liveListings.filter(x=>(county==='all'||x.county===county)&&
    (type==='all'||(type==='house'&&x.category==='Residential')||(type==='commercial'&&x.category==='Commercial')||(type==='land'&&x.category==='Land')||x.category===type)&&
    (!location||((x.town||'')+' '+(x.estate||'')).toLowerCase().includes(location))&&
    (budget==='all'||Number(x.price)<=Number(budget)));
  grid.replaceChildren(...matches.map(makeCard));
  const empty=document.getElementById('emptyState');if(empty)empty.hidden=matches.length!==0;
  observeReveal();
}
document.getElementById('searchForm')?.addEventListener('submit',e=>{e.preventDefault();applyFilters();document.getElementById('discover')?.scrollIntoView({behavior:'smooth'});});
document.querySelectorAll('[data-category]').forEach(link=>link.addEventListener('click',()=>{
  const value=link.dataset.category,select=document.getElementById('typeFilter');
  if(select){select.value=value==='house'?'house':value==='land'?'land':value;document.getElementById('searchForm')?.requestSubmit();}
}));
async function loadPublicListings(){
  if(!grid)return;
  try{
    const q=query(collection(db,'publicListings'),where('status','==','approved'),where('expiresAt','>',Timestamp.now()),orderBy('expiresAt','asc'),orderBy('createdAt','desc'),limit(60));
    const snap=await getDocs(q);
    liveListings=snap.docs.map(d=>({id:d.id,...d.data()}));
    liveListings.sort((a,b)=>tierRank(a.advertiserTier)-tierRank(b.advertiserTier)||((b.createdAt?.toMillis?.()||0)-(a.createdAt?.toMillis?.()||0)));
    if(liveListings.length)grid.replaceChildren(...liveListings.map(makeCard));
    else grid.innerHTML='<article class="property-card"><div class="property-info"><div class="property-meta">SKYNEST MARKETPLACE</div><h3>Listings are opening soon</h3><p>Approved adverts will appear here after the moderation team reviews them.</p></div></article>';
    applyFilters();
    if(feedStatus)feedStatus.textContent=liveListings.length?liveListings.length+' approved adverts · Premium first':'No approved adverts yet';
  }catch(error){console.error('Could not load public listings',error);if(feedStatus)feedStatus.textContent='Live listings are not available yet.';}
}
function observeReveal(){
  const nodes=document.querySelectorAll('.reveal:not(.is-visible)');
  if(!('IntersectionObserver'in window)){nodes.forEach(n=>n.classList.add('is-visible'));return;}
  const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('is-visible');observer.unobserve(entry.target);}}),{threshold:.12});
  nodes.forEach(n=>observer.observe(n));
}
document.addEventListener('DOMContentLoaded',observeReveal);
loadPublicListings();
if('serviceWorker'in navigator&&location.protocol.startsWith('http'))window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));

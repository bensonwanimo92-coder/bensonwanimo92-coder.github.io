import { db } from "./firebase-config.js";
import { collection,getDocs,limit,orderBy,query,Timestamp,where } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
const $=id=>document.getElementById(id);
const menu=$('menuToggle'),nav=$('mainNav');menu?.addEventListener('click',()=>nav.classList.toggle('open'));nav?.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>nav.classList.remove('open')));
$('year').textContent=new Date().getFullYear();
let listings=[];
const money=n=>Number(n)>0?new Intl.NumberFormat('en-KE',{style:'currency',currency:'KES',maximumFractionDigits:0}).format(Number(n)):'Contact for price';
function card(x){
 const el=document.createElement('article');el.className='listing-card';
 const img=document.createElement('img');img.loading='lazy';img.alt=x.title||'SkyNest advert';img.src=(Array.isArray(x.photoUrls)&&x.photoUrls[0])||x.imageUrl||'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=900&q=75';
 const body=document.createElement('div');body.className='listing-card-body';
 const meta=document.createElement('div');meta.className='meta';meta.textContent=(x.category||'Advert')+' · '+(x.county||'Kenya');
 const h=document.createElement('h3');h.textContent=x.title||'SkyNest listing';
 const p=document.createElement('p');p.textContent=[x.town,x.estate,x.description].filter(Boolean).join(' · ').slice(0,150);
 const bottom=document.createElement('div');bottom.className='listing-bottom';const price=document.createElement('span');price.textContent=money(x.price);const contact=document.createElement('a');contact.textContent='Contact ↗';contact.href=x.contactPhone?'tel:'+String(x.contactPhone).replace(/[^+0-9]/g,''):'advertiser.html';bottom.append(price,contact);body.append(meta,h,p,bottom);el.append(img,body);return el;
}
function filter(){
 const type=$('typeFilter').value,loc=$('locationFilter').value.trim().toLowerCase(),key=$('keywordFilter').value.trim().toLowerCase();
 const out=listings.filter(x=>{const cat=String(x.category||'').toLowerCase();const t=type==='all'||(type==='Property'&&['residential','commercial','property','development'].includes(cat))||(type==='Land & Farms'&&['land','farm','farms & agriculture'].includes(cat))||(type==='Vehicles'&&['vehicle','vehicles','cars'].includes(cat))||(type==='Jobs'&&['jobs','employment'].includes(cat))||(type==='Restaurants'&&['restaurant','restaurants'].includes(cat))||(type==='Luxury & Lifestyle'&&['luxury','luxury & lifestyle'].includes(cat))||(type==='Business & Services'&&['business','business & services'].includes(cat))||(type==='Other'&&['other'].includes(cat));const place=[x.county,x.town,x.estate].join(' ').toLowerCase();const words=[x.title,x.description,x.category,x.town,x.county].join(' ').toLowerCase();return t&&(!loc||place.includes(loc))&&(!key||words.includes(key));});
 const grid=$('listingGrid');grid.replaceChildren(...out.map(card));if(!out.length){const e=document.createElement('div');e.className='loading-card';e.textContent=listings.length?'No adverts match your search. Try a different category or location.':'No approved adverts are live yet. Be among the first to advertise on SkyNest.';grid.append(e);}
}
$('searchForm').addEventListener('submit',e=>{e.preventDefault();filter();$('listingGrid').scrollIntoView({behavior:'smooth',block:'start'});});
async function load(){try{const q=query(collection(db,'publicListings'),where('status','==','approved'),where('expiresAt','>',Timestamp.now()),orderBy('expiresAt','asc'),orderBy('createdAt','desc'),limit(60));const s=await getDocs(q);listings=s.docs.map(d=>({id:d.id,...d.data()}));filter();$('liveFeedStatus').textContent=listings.length?listings.length+' approved adverts loaded':'No approved adverts published yet.';}catch(e){console.error(e);$('liveFeedStatus').textContent='Live feed could not connect. Check Firebase rules and indexes.';const grid=$('listingGrid');grid.innerHTML='<div class="loading-card">Marketplace feed is temporarily unavailable.</div>';}}
load();
// Cookie choices: essential storage only by default; analytics is opt-in and no analytics tracker is activated by this UI.
const banner=$('cookieBanner'),dialog=$('cookieDialog'),analytics=$('analyticsChoice');
function readChoice(){try{return JSON.parse(localStorage.getItem('skynestCookiePrefs')||'null')}catch{return null}}
function saveChoice(analyticsOn){localStorage.setItem('skynestCookiePrefs',JSON.stringify({essential:true,analytics:!!analyticsOn,updatedAt:new Date().toISOString()}));banner.hidden=true;dialog.close();}
const choice=readChoice();if(!choice)banner.hidden=false;
$('cookieAccept').addEventListener('click',()=>saveChoice(true));$('cookieReject').addEventListener('click',()=>saveChoice(false));
function openPrefs(){analytics.checked=!!readChoice()?.analytics;dialog.showModal();}
$('cookieSettingsOpen').addEventListener('click',openPrefs);$('cookieSettings').addEventListener('click',openPrefs);
$('saveCookiePrefs').addEventListener('click',()=>saveChoice(analytics.checked));$('acceptAllCookies').addEventListener('click',()=>saveChoice(true));

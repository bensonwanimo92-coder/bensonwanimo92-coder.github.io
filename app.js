import { db } from "./firebase-config.js";
import {
  collection, getDocs, limit, orderBy, query, Timestamp, where
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

const counties=["Baringo","Bomet","Bungoma","Busia","Elgeyo-Marakwet","Embu","Garissa","Homa Bay","Isiolo","Kajiado","Kakamega","Kericho","Kiambu","Kilifi","Kirinyaga","Kisii","Kisumu","Kitui","Kwale","Laikipia","Lamu","Machakos","Makueni","Mandera","Marsabit","Meru","Migori","Mombasa","Murang'a","Nairobi","Nakuru","Nandi","Narok","Nyamira","Nyandarua","Nyeri","Samburu","Siaya","Taita-Taveta","Tana River","Tharaka-Nithi","Trans Nzoia","Turkana","Uasin Gishu","Vihiga","Wajir","West Pokot"];
const menuToggle=document.getElementById('menuToggle'),mainNav=document.getElementById('mainNav');
menuToggle?.addEventListener('click',()=>{const open=mainNav.classList.toggle('open');menuToggle.setAttribute('aria-expanded',String(open));menuToggle.setAttribute('aria-label',open?'Close navigation':'Open navigation')});
mainNav?.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{mainNav.classList.remove('open');menuToggle?.setAttribute('aria-expanded','false')}));
const year=document.getElementById('year');if(year)year.textContent=new Date().getFullYear();
const countyGrid=document.getElementById('countyGrid');
if(countyGrid){countyGrid.innerHTML=counties.map(c=>'<button class="county-chip" type="button" data-county="'+c.replaceAll('"','&quot;')+'">'+c+'</button>').join('');countyGrid.addEventListener('click',e=>{const b=e.target.closest('[data-county]');if(!b)return;document.getElementById('countyFilter').value=b.dataset.county;document.getElementById('discover')?.scrollIntoView({behavior:'smooth'});document.getElementById('searchForm')?.requestSubmit()})}

const grid=document.getElementById('listingGrid');
const status=document.getElementById('liveFeedStatus');
let liveListings=[];
function money(value){return new Intl.NumberFormat('en-KE',{style:'currency',currency:'KES',maximumFractionDigits:0}).format(Number(value)||0)}
function makeCard(item){
  const card=document.createElement('article');card.className='property-card live-property-card';
  const photo=document.createElement('div');photo.className='property-photo photo-one';
  const tag=document.createElement('span');tag.className='photo-tag';tag.textContent='VERIFIED ADVERT';photo.append(tag);
  const info=document.createElement('div');info.className='property-info';
  const meta=document.createElement('div');meta.className='property-meta';meta.textContent=(item.category||'PROPERTY')+' · '+(item.county||'KENYA');
  const title=document.createElement('h3');title.textContent=item.title||'Property listing';
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
    (type==='all'||(type==='house'&&x.category==='Residential')||(type==='commercial'&&x.category==='Commercial')||(type==='land'&&x.category==='Land'))&&
    (!location||((x.town||'')+' '+(x.estate||'')).toLowerCase().includes(location))&&
    (budget==='all'||Number(x.price)<=Number(budget)));
  grid.replaceChildren(...matches.map(makeCard));
  const empty=document.getElementById('emptyState');
  if(empty)empty.hidden=matches.length!==0;
}
document.getElementById('searchForm')?.addEventListener('submit',e=>{e.preventDefault();applyFilters();document.getElementById('discover')?.scrollIntoView({behavior:'smooth'})});
async function loadPublicListings(){
  if(!grid)return;
  try{
    const q=query(collection(db,'publicListings'),where('status','==','approved'),where('expiresAt','>',Timestamp.now()),orderBy('expiresAt','asc'),orderBy('createdAt','desc'),limit(30));
    const snap=await getDocs(q);
    liveListings=snap.docs.map(d=>({id:d.id,...d.data()}));
    const notice=document.querySelector('.demo-notice');
    if(notice)notice.textContent=liveListings.length?'Showing approved, currently active advertiser listings.':'No approved live listings yet. Sample cards below are illustrative only.';
    if(liveListings.length){grid.replaceChildren(...liveListings.map(makeCard));}
    else {grid.innerHTML='<article class="property-card"><div class="property-info"><div class="property-meta">SKYNEST MARKETPLACE</div><h3>Listings are opening soon</h3><p>Advertisers can register and submit properties for review. Approved listings will appear here.</p></div></article>';}
    applyFilters();
    if(status)status.textContent=liveListings.length+' approved live listings';
  }catch(error){
    console.error('Could not load public listings',error);
    if(status)status.textContent='Live listings are not available yet.';
  }
}
loadPublicListings();
if('serviceWorker' in navigator&&location.protocol.startsWith('http'))window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));

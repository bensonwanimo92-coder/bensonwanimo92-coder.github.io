import { auth, db } from "./firebase-config.js";
import { initCookieConsent } from "./consent.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import { addDoc, collection, getDocs, orderBy, query, serverTimestamp, Timestamp, updateDoc, where, doc, limit, getDoc } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
initCookieConsent();
const $=id=>document.getElementById(id);
let user=null,admin=false;
$('year').textContent=new Date().getFullYear();
$('signOutButton').addEventListener('click',async()=>{await signOut(auth);location.href='advertiser.html';});
onAuthStateChanged(auth,async u=>{
 user=u;
 if(!u){$('accessStatus').textContent='Please sign in with your SkyNest account first.';const a=document.createElement('a');a.href='advertiser.html';a.textContent='Open advertiser sign-in';$('accessPanel').append(a);return;}
 await checkAccess();
});
async function checkAccess(){
 if(!user)return;await user.reload();user=auth.currentUser;
 const token=await user.getIdTokenResult();
 admin=token.claims.marketplaceAdmin===true||(user.uid==='PN9bC3ZzgSaOK1JjG4TcjCU9Grx1'&&user.email==='bensonwanimo92@gmail.com'&&user.emailVerified===true);
 if(admin){$('accessStatus').textContent='Administrator access confirmed. Review and publishing controls are enabled.';$('queue').hidden=false;$('published').hidden=false;await Promise.all([loadQueue(),loadPublished(),loadAudit()]);}
 else{$('accessStatus').textContent='This account is not an authorised marketplace administrator. Access is restricted.';$('queue').hidden=true;$('published').hidden=true;}
}
$('refreshButton').addEventListener('click',loadQueue);
$('refreshPublishedButton').addEventListener('click',loadPublished);\n$('refreshAuditButton').addEventListener('click',loadAudit);
function makeMediaPreview(item){
 const wrap=document.createElement('div');wrap.className='moderation-media';
 (item.media||[]).forEach(m=>{
  if(m.kind==='image'&&m.url){const a=document.createElement('a');a.href=m.url;a.target='_blank';a.rel='noopener';const img=document.createElement('img');img.src=m.url;img.alt=m.name||'Advert image';img.loading='lazy';a.append(img);wrap.append(a);}
  else if(m.kind==='video'&&m.url){const video=document.createElement('video');video.src=m.url;video.controls=true;video.preload='metadata';wrap.append(video);}
 });
 return wrap;
}
function detailText(x){
 const parts=Object.entries(x.details||{}).filter(([k,v])=>v!==''&&v!==null&&v!==undefined).map(([k,v])=>k.replace(/([A-Z])/g,' $1')+': '+v);
 return parts.join(' · ');
}
async function loadQueue(){
 if(!admin)return;const root=$('reviewCards');root.replaceChildren();$('queueStatus').textContent='Loading pending adverts…';
 try{
  const q=query(collection(db,'publicListings'),where('status','==','pending'),orderBy('createdAt','asc'),limit(50));
  const snap=await getDocs(q);$('queueStatus').textContent=snap.size+' advert(s) awaiting review.';
  if(snap.empty){root.textContent='No adverts are waiting for review.';return;}
  snap.forEach(s=>{
   const x=s.data(),card=document.createElement('article');card.className='moderation-card panel';
   const title=document.createElement('h2');title.textContent=x.title||'Untitled advert';
   const meta=document.createElement('p');meta.textContent=[x.category,x.advertType,x.county,x.town,'KSh '+Number(x.price||0).toLocaleString('en-KE'),x.contactPhone,x.businessName].filter(Boolean).join(' · ');
   const description=document.createElement('p');description.textContent=x.description||'';
   const details=document.createElement('p');details.className='moderation-details';details.textContent=detailText(x);
   const media=makeMediaPreview(x);
   const reason=document.createElement('textarea');reason.placeholder='Reason or changes requested (shown to advertiser)';reason.rows=2;reason.className='moderation-reason';
   const tier=document.createElement('select');tier.className='moderation-tier';tier.innerHTML='<option value="basic">Basic tier</option><option value="standard">Standard tier</option><option value="premium">Premium tier</option>';tier.value=x.advertiserTier||'basic';
   const actions=document.createElement('div');actions.className='moderation-actions';
   const approve=document.createElement('button');approve.className='button dark-button';approve.textContent='Approve & publish';
   const changes=document.createElement('button');changes.className='button';changes.textContent='Request changes';
   const reject=document.createElement('button');reject.className='button';reject.textContent='Reject';
   approve.addEventListener('click',()=>moderate(s.id,'approved',{reason:reason.value,tier:tier.value}));
   changes.addEventListener('click',()=>{if(!reason.value.trim()){alert('Please explain what the advertiser must change.');return;}moderate(s.id,'changes_requested',{reason:reason.value});});
   reject.addEventListener('click',()=>{if(!reason.value.trim()){alert('Please provide a rejection reason.');return;}moderate(s.id,'rejected',{reason:reason.value});});
   actions.append(tier,approve,changes,reject);card.append(title,meta,description,details,media,reason,actions);root.append(card);
  });
 }catch(e){$('queueStatus').textContent='Could not load moderation queue: '+e.message;}
}
async function moderate(id,status,options={}){
 if(!admin||!user)return;
 try{
  const update={status,reviewedAt:serverTimestamp(),reviewedBy:user.uid,updatedAt:serverTimestamp()};
  if(options.reason)update.rejectionReason=options.reason.trim().slice(0,1000);
  if(status==='approved'){update.expiresAt=Timestamp.fromDate(new Date(Date.now()+30*24*60*60*1000));update.advertiserTier=options.tier||'basic';}
  await updateDoc(doc(db,'publicListings',id),update);
  await loadQueue();if(status==='approved')await loadPublished();
 }catch(e){alert('Moderation failed: '+e.message);}
}
async function writeAudit(listingId,ownerUid,action,reason,tier){
 if(!admin||!user)return;
 await addDoc(collection(db,'marketplaceModerationLogs'),{
  listingId,ownerUid,action,reason:String(reason||'').slice(0,1000),
  advertiserTier:tier||'basic',actorUid:user.uid,actorEmail:user.email||'',createdAt:serverTimestamp()
 });
}
async function loadAudit(){
 if(!admin)return;const root=$('auditCards');if(!root)return;root.replaceChildren();$('auditStatus').textContent='Loading audit history…';
 try{
  const snap=await getDocs(query(collection(db,'marketplaceModerationLogs'),orderBy('createdAt','desc'),limit(30)));
  $('auditStatus').textContent=snap.size+' recent moderation action(s).';
  if(snap.empty){root.textContent='No moderation actions recorded yet.';return;}
  snap.forEach(s=>{const x=s.data(),row=document.createElement('article');row.className='published-row';
   const summary=document.createElement('div');const title=document.createElement('b');title.textContent=(x.action||'action').replaceAll('_',' ').toUpperCase()+' · '+(x.listingId||'');
   const meta=document.createElement('small');meta.textContent=[x.actorEmail,x.advertiserTier,x.reason].filter(Boolean).join(' · ');
   summary.append(title,meta);row.append(summary);root.append(row);
  });
 }catch(e){$('auditStatus').textContent='Could not load audit history: '+e.message;}
}
async function loadPublished(){
 if(!admin)return;const root=$('publishedCards');root.replaceChildren();$('publishedStatus').textContent='Loading published adverts…';
 try{
  const q=query(collection(db,'publicListings'),where('status','==','approved'),orderBy('createdAt','desc'),limit(50));
  const snap=await getDocs(q);$('publishedStatus').textContent=snap.size+' approved advert(s).';
  if(snap.empty){root.textContent='No published adverts yet.';return;}
  snap.forEach(s=>{
   const x=s.data(),row=document.createElement('article');row.className='published-row';
   const text=document.createElement('div');const title=document.createElement('b');title.textContent=x.title||'Untitled';const meta=document.createElement('small');meta.textContent=(x.category||'')+' · '+(x.county||'')+' · '+(x.advertiserTier||'basic').toUpperCase();text.append(title,meta);
   const pause=document.createElement('button');pause.className='button';pause.textContent='Pause advert';pause.addEventListener('click',async()=>{
    if(!confirm('Pause this advert? It will disappear from public listings.'))return;
    try{await updateDoc(doc(db,'publicListings',s.id),{status:'paused',reviewedAt:serverTimestamp(),reviewedBy:user.uid,updatedAt:serverTimestamp(),rejectionReason:'Paused by marketplace administrator.'});await writeAudit(s.id,x.ownerUid,'paused','Paused by marketplace administrator.',x.advertiserTier||'basic');await loadPublished();await loadAudit();}catch(e){alert('Could not pause advert: '+e.message);}
   });
   row.append(text,pause);root.append(row);
  });
 }catch(e){$('publishedStatus').textContent='Could not load published adverts: '+e.message;}
}

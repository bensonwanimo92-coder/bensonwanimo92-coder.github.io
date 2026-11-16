import { auth, db } from "./firebase-config.js";
import { getIdTokenResult, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import { addDoc, collection, getDocs, limit, orderBy, query, serverTimestamp, Timestamp, updateDoc, doc } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
const $=id=>document.getElementById(id);
let user=null,admin=false,records=[];
$('year').textContent=new Date().getFullYear();
const safe=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=value=>Number(value)>0?new Intl.NumberFormat('en-KE',{style:'currency',currency:'KES',maximumFractionDigits:0}).format(Number(value)):'Negotiable';
const date=value=>value?.toDate?value.toDate().toLocaleString('en-KE',{dateStyle:'medium',timeStyle:'short'}):'—';
$('signOutButton').addEventListener('click',async()=>{await signOut(auth);location.href='advertiser.html';});
onAuthStateChanged(auth,async signedInUser=>{
  user=signedInUser;
  if(!user){$('accessStatus').textContent='Sign in with the verified administrator account to open Inventory.';const link=document.createElement('a');link.href='advertiser.html';link.className='button';link.textContent='Open secure sign-in';$('accessPanel').append(link);return;}
  try{await user.reload();user=auth.currentUser;}catch(e){$('accessStatus').textContent='Could not refresh account verification: '+e.message;return;}
  const token=await getIdTokenResult(user,true);\n  admin=token.claims.marketplaceAdmin===true||(user.uid==='PN9bC3ZzgSaOK1JjG4TcjCU9Grx1'&&user.email==='bensonwanimo92@gmail.com'&&user.emailVerified===true);
  if(admin){$('accessStatus').textContent='Verified administrator access confirmed.';$('inventoryWorkspace').hidden=false;await loadInventory();await loadActivity();}
  else{$('accessStatus').textContent='Access denied. This account is not the verified marketplace administrator.';$('inventoryWorkspace').hidden=true;}
});
$('refreshButton').addEventListener('click',async()=>{await loadInventory();await loadActivity();});
$('inventorySearch').addEventListener('input',renderInventory);
$('statusFilter').addEventListener('change',renderInventory);
$('categoryFilter').addEventListener('change',renderInventory);
async function loadInventory(){
 if(!admin)return;
 $('queueStatus').textContent='Loading inventory…';
 try{
  const snap=await getDocs(query(collection(db,'publicListings'),orderBy('updatedAt','desc'),limit(200)));
  records=snap.docs.map(s=>({id:s.id,...s.data()}));
  const count=status=>records.filter(x=>x.status===status).length;
  $('statTotal').textContent=records.length;$('statPending').textContent=count('pending');$('statLive').textContent=count('approved');$('statPaused').textContent=count('paused')+count('rejected');
  $('queueStatus').textContent='Showing '+records.length+' most recently updated advert(s).';
  renderInventory();
 }catch(e){$('queueStatus').textContent='Inventory could not load: '+e.message+' — check the deployed Firestore rules and indexes.';}
}
function renderInventory(){
 const root=$('reviewCards');root.replaceChildren();
 const status=$('statusFilter').value,category=$('categoryFilter').value,term=$('inventorySearch').value.trim().toLowerCase();
 const filtered=records.filter(x=>(status==='all'||x.status===status)&&(category==='all'||x.category===category)&&(!term||[x.title,x.ownerUid,x.category,x.county,x.town,x.contactPhone,x.description].join(' ').toLowerCase().includes(term)));
 if(!filtered.length){const empty=document.createElement('div');empty.className='empty-inventory';empty.textContent=records.length?'No adverts match those filters.':'No marketplace adverts have been submitted yet.';root.append(empty);return;}
 for(const x of filtered){
  const card=document.createElement('article');card.className='inventory-card';
  const head=document.createElement('div');head.className='inventory-card-head';
  const badge=document.createElement('span');badge.className='status-badge '+safe(x.status||'draft');badge.textContent=String(x.status||'draft').replace('_',' ').toUpperCase();
  const id=document.createElement('small');id.textContent='ID · '+x.id.slice(0,9);head.append(badge,id);
  const title=document.createElement('h3');title.textContent=x.title||'Untitled advert';
  const meta=document.createElement('p');meta.className='inventory-meta';meta.textContent=[x.category,x.advertType,x.town,x.county].filter(Boolean).join(' · ');
  const desc=document.createElement('p');desc.className='inventory-description';desc.textContent=x.description||'No description provided.';
  const details=document.createElement('div');details.className='inventory-details';details.innerHTML='<span><small>PRICE / RATE</small><b>'+safe(money(x.price))+'</b></span><span><small>ADVERTISER UID</small><b>'+safe((x.ownerUid||'—').slice(0,14))+'</b></span><span><small>LAST UPDATED</small><b>'+safe(date(x.updatedAt))+'</b></span>';
  const contact=document.createElement('p');contact.className='inventory-contact';contact.textContent='Contact: '+(x.contactPhone||'Not supplied')+(x.businessName?' · '+x.businessName:'');
  const actions=document.createElement('div');actions.className='inventory-actions';
  const addAction=(label,next,kind)=>{const b=document.createElement('button');b.type='button';b.className='button '+kind;b.textContent=label;b.addEventListener('click',()=>moderate(x,next));actions.append(b);};
  if(x.status==='pending'||x.status==='draft'||x.status==='rejected'||x.status==='changes_requested')addAction('Approve & publish','approved','action-green');
  if(x.status==='pending'||x.status==='approved')addAction('Reject','rejected','action-red');
  if(x.status==='approved')addAction('Pause advert','paused','action-blue');
  if(x.status==='paused')addAction('Resume & publish','approved','action-green');
  if(x.status==='pending')addAction('Request changes','changes_requested','action-amber');
  card.append(head,title,meta,desc,details,contact,actions);root.append(card);
 }
}
async function moderate(item,status){
 if(!admin||!user)return;
 const reason=status==='rejected'?'Rejected by marketplace administrator':status==='changes_requested'?'Changes requested by marketplace administrator':status==='paused'?'Paused by marketplace administrator':'';
 const update={status,reviewedAt:serverTimestamp(),reviewedBy:user.uid,updatedAt:serverTimestamp()};
 if(status==='approved')update.expiresAt=Timestamp.fromDate(new Date(Date.now()+30*24*60*60*1000));
 if(reason)update.rejectionReason=reason;
 try{
  await updateDoc(doc(db,'publicListings',item.id),update);
  try{await addDoc(collection(db,'marketplaceModerationLogs'),{listingId:item.id,ownerUid:item.ownerUid||'',action:status,reason,advertiserTier:['basic','standard','premium'].includes(item.advertiserTier)?item.advertiserTier:'basic',actorUid:user.uid,actorEmail:user.email||'',createdAt:serverTimestamp()});}catch(logError){console.warn('Listing updated, but audit log could not be written:',logError);}
  await loadInventory();await loadActivity();
 }catch(e){alert('Could not update this advert: '+e.message);}
}
async function loadActivity(){
 if(!admin)return;
 try{
  const snap=await getDocs(query(collection(db,'marketplaceModerationLogs'),orderBy('createdAt','desc'),limit(12)));
  const root=$('activityList');root.replaceChildren();
  if(snap.empty){root.textContent='No moderation actions have been recorded yet.';return;}
  snap.forEach(s=>{const x=s.data(),row=document.createElement('div');row.className='activity-row';const strong=document.createElement('b');strong.textContent=String(x.action||'updated').replace('_',' ');const info=document.createElement('span');info.textContent='Advert '+(x.listingId||'').slice(0,9)+' · '+(x.actorEmail||'administrator');const time=document.createElement('small');time.textContent=date(x.createdAt);row.append(strong,info,time);root.append(row);});
 }catch(e){$('activityList').textContent='Activity log unavailable: '+e.message;}
}

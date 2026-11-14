import { auth, db } from "./firebase-config.js";
import { initCookieConsent } from "./consent.js";
initCookieConsent();
import {
  createUserWithEmailAndPassword, onAuthStateChanged, sendEmailVerification,
  signInWithEmailAndPassword, signOut
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import {
  addDoc, collection, getDocs, getDoc, orderBy, query, serverTimestamp, updateDoc, where, doc
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
import {
  getStorage, ref as storageRef, uploadBytes, getDownloadURL, deleteObject
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-storage.js";

const $=id=>document.getElementById(id);
const form=$('listingForm'), authForm=$('authForm'), storage=getStorage();
authForm?.addEventListener('submit',e=>e.preventDefault());
let currentUser=null, selectedMedia=[], existingMedia=[], removedMedia=[], editingListingId=null;
const MAX_PHOTOS=10,MAX_VIDEOS=3,MAX_PHOTO_BYTES=8*1024*1024,MAX_VIDEO_BYTES=20*1024*1024,MAX_VIDEO_SECONDS=60;
function status(message){$('authStatus').textContent=message;}
function price(value){return new Intl.NumberFormat('en-KE',{style:'currency',currency:'KES',maximumFractionDigits:0}).format(Number(value)||0);}
function safe(text){return String(text??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function setWorkspace(user){
  currentUser=user;
  $('workspaceName').textContent=user?((user.displayName||user.email?.split('@')[0]||'Advertiser')):'Guest workspace';
  $('workspaceEmail').textContent=user?user.email:'Sign in to manage adverts';
  $('signOutButton').hidden=!user;
  $('authPanel').hidden=!!user && user.emailVerified;
  if(user){status(user.emailVerified?'Signed in. Your advertiser workspace is ready.':'Signed in, but email verification is still required. Check your inbox.');$('resendVerification').hidden=user.emailVerified;$('refreshVerification').hidden=user.emailVerified;}
}
async function loadListings(user){
  const body=$('myListingsBody');
  const q=query(collection(db,'publicListings'),where('ownerUid','==',user.uid),orderBy('updatedAt','desc'));
  const snap=await getDocs(q);
  if(snap.empty){body.innerHTML='<tr><td colspan="5">No adverts yet. Create your first listing below.</td></tr>';return;}
  body.replaceChildren();
  snap.forEach(item=>{
    const x=item.data(),tr=document.createElement('tr'),cell=document.createElement('td');
    cell.innerHTML='<span class="property-cell"><i class="thumb thumb-house">✧</i><span><b>'+safe(x.title)+'</b><small>'+safe(x.town)+', '+safe(x.county)+'</small>'+(x.rejectionReason?'<small class="review-note">Review note: '+safe(x.rejectionReason)+'</small>':'')+'</span></span>';
    const category=document.createElement('td');category.textContent=x.category||'—';
    const amount=document.createElement('td');amount.textContent=price(x.price);
    const state=document.createElement('td');state.innerHTML='<span class="status">'+safe(String(x.status||'draft').toUpperCase())+'</span>';
    const updated=document.createElement('td');updated.textContent=x.updatedAt?.toDate?x.updatedAt.toDate().toLocaleDateString():'Just now';
    if(['draft','rejected','changes_requested'].includes(x.status)){const edit=document.createElement('button');edit.type='button';edit.className='button';edit.textContent='Edit / resubmit';edit.addEventListener('click',()=>editListing(item.id));cell.append(edit);}
    tr.append(cell,category,amount,state,updated);body.append(tr);
  });
}
async function refresh(){
  if(!currentUser)return;
  await loadListings(currentUser);
  const claim=await currentUser.getIdTokenResult(),admin=claim.claims.marketplaceAdmin===true||(currentUser.uid==='PN9bC3ZzgSaOK1JjG4TcjCU9Grx1'&&currentUser.email==='bensonwanimo92@gmail.com'&&currentUser.emailVerified===true);
  const nav=document.querySelector('.sidebar nav');
  if(admin&&!document.getElementById('adminNavLink')){
    const a=document.createElement('a');a.id='adminNavLink';a.href='admin.html';a.textContent='⚑  Moderation centre';nav.append(a);
  }
}
$('loginButton').addEventListener('click',async()=>{
  try{await signInWithEmailAndPassword(auth,$('authEmail').value.trim(),$('authPassword').value);status('Signed in.');}
  catch(e){status(e.message);}
});
$('registerButton').addEventListener('click',async()=>{
  try{const credential=await createUserWithEmailAndPassword(auth,$('authEmail').value.trim(),$('authPassword').value);await sendEmailVerification(credential.user);status('Account created. A verification link has been sent to your email. Verify it, then sign in again.');}
  catch(e){status(e.message);}
});
$('resendVerification').addEventListener('click',async()=>{
  try{if(!auth.currentUser)throw new Error('Sign in first.');await sendEmailVerification(auth.currentUser);status('Verification email sent again.');}
  catch(e){status(e.message);}
});
$('signOutButton').addEventListener('click',()=>signOut(auth));
$('refreshVerification').addEventListener('click',async()=>{try{await auth.currentUser.reload();const fresh=auth.currentUser;setWorkspace(fresh);if(fresh.emailVerified)await refresh();else status('Email is not verified yet. Open the link sent to your inbox first.');}catch(e){status(e.message);}});
onAuthStateChanged(auth,async user=>{
  setWorkspace(user);
  if(user){$('resendVerification').hidden=user.emailVerified;try{await refresh();}catch(e){console.error(e);$('myListingsBody').innerHTML='<tr><td colspan="5">Could not load adverts. Check Firestore rules and indexes.</td></tr>';}}
});
const category=$('categorySelect');
const categoryPanels={
  Residential:['residentialFields'],Commercial:['commercialFields'],Development:['developmentFields'],
  Land:['landFields'],Vehicles:['vehicleFields'],Restaurants:['restaurantFields'],
  Hospitality:['hospitalityFields'],Products:['productFields'],Services:['serviceFields'],Luxury:['generalFields']
};
category?.addEventListener('change',()=>{
  document.querySelectorAll('.category-fields').forEach(el=>{el.hidden=true;el.querySelectorAll('input,select,textarea').forEach(field=>{field.value='';});});
  (categoryPanels[category.value]||[]).forEach(id=>$(id).hidden=false);
});
function videoDuration(file){
  return new Promise((resolve,reject)=>{
    const url=URL.createObjectURL(file),video=document.createElement('video');
    video.preload='metadata';video.onloadedmetadata=()=>{const d=video.duration;URL.revokeObjectURL(url);resolve(d);};
    video.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('Could not read video '+file.name));};video.src=url;
  });
}
function renderMediaPreview(){
  const root=$('mediaPreview');root.replaceChildren();
  existingMedia.forEach((file,index)=>{const item=document.createElement('div');item.className='media-preview-item';const label=document.createElement('span');label.textContent=(file.kind==='video'?'EXISTING VIDEO · ':'EXISTING PHOTO · ')+file.name;const remove=document.createElement('button');remove.type='button';remove.textContent='Remove';remove.addEventListener('click',()=>{removedMedia.push(file);existingMedia.splice(index,1);renderMediaPreview();});item.append(label,remove);root.append(item);});
  selectedMedia.forEach((file,index)=>{
    const item=document.createElement('div');item.className='media-preview-item';
    const label=document.createElement('span');label.textContent=(file.type.startsWith('video/')?'VIDEO · ':'PHOTO · ')+file.name;
    const remove=document.createElement('button');remove.type='button';remove.textContent='Remove';remove.addEventListener('click',()=>{selectedMedia.splice(index,1);renderMediaPreview();});
    item.append(label,remove);root.append(item);
  });
}
$('mediaFiles')?.addEventListener('change',()=>{
  const incoming=Array.from($('mediaFiles').files||[]);
  const photos=selectedMedia.filter(f=>f.type.startsWith('image/')).length;
  const videos=selectedMedia.filter(f=>f.type.startsWith('video/')).length;
  if(photos+incoming.filter(f=>f.type.startsWith('image/')).length>MAX_PHOTOS||videos+incoming.filter(f=>f.type.startsWith('video/')).length>MAX_VIDEOS){
    $('uploadStatus').textContent='Limit: 10 photos and 3 videos per advert.';$('mediaFiles').value='';return;
  }
  for(const file of incoming){
    if(file.type.startsWith('image/')&&file.size>MAX_PHOTO_BYTES){$('uploadStatus').textContent=file.name+' exceeds the 8 MB photo limit.';continue;}
    if(file.type.startsWith('video/')&&file.size>MAX_VIDEO_BYTES){$('uploadStatus').textContent=file.name+' exceeds the 20 MB video limit.';continue;}
    if(!file.type.startsWith('image/')&&!file.type.startsWith('video/'))continue;
    selectedMedia.push(file);
  }
  renderMediaPreview();$('mediaFiles').value='';
});
async function optimiseImage(file){
  if(!file.type.startsWith('image/')||!('createImageBitmap' in window))return file;
  const bitmap=await createImageBitmap(file),scale=Math.min(1,1800/Math.max(bitmap.width,bitmap.height));
  const canvas=document.createElement('canvas');canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);
  canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close?.();
  const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.82));
  return blob?new File([blob],file.name.replace(/\.[^.]+$/,'')+'.jpg',{type:'image/jpeg'}):file;
}
async function uploadListingMedia(listingId){
  const uploaded=[];
  for(let i=0;i<selectedMedia.length;i++){
    const original=selectedMedia[i],file=original.type.startsWith('image/')?await optimiseImage(original):original;
    if(file.type.startsWith('video/')&&await videoDuration(file)>MAX_VIDEO_SECONDS)throw new Error(original.name+' is longer than 60 seconds.');
    const clean=file.name.replace(/[^a-zA-Z0-9._-]/g,'_').slice(-90),path='listing_media/'+currentUser.uid+'/'+listingId+'/'+Date.now()+'_'+i+'_'+clean;
    $('uploadStatus').textContent='Uploading media '+(i+1)+' of '+selectedMedia.length+'…';
    const target=storageRef(storage,path);
    await uploadBytes(target,file,{contentType:file.type,customMetadata:{ownerUid:currentUser.uid,listingId}});
    const url=await getDownloadURL(target);
    uploaded.push({name:original.name,storagePath:path,url,contentType:file.type,size:file.size,kind:file.type.startsWith('video/')?'video':'image'});
  }
  return uploaded;
}
function collectDetails(data){
  const keys=['size','furnishing','amenities','spaceType','floorArea','parking','zoning','developer','unitCount','completion','handover','landSize','landUse','waterAccess','titleStatus','landNotes','make','model','yearMade','mileage','fuel','transmission','bodyType','condition','cuisine','openingHours','priceRange','bookingLink','menuHighlights','brandModel','availability','serviceArea','address','stayType','capacity','checkin','facilities','warranty','delivery','serviceType','available'];
  const details={};
  keys.forEach(key=>{const value=data.getAll(key).find(v=>v!==null&&String(v).trim()!=='');if(value!==undefined)details[key]=['bedrooms','bathrooms','yearMade','mileage','unitCount'].includes(key)?Number(value):String(value).trim();});
  return details;
}
async function editListing(id){
  try{
    const snap=await getDoc(doc(db,'publicListings',id));if(!snap.exists())throw new Error('This advert is no longer available.');
    const x=snap.data();editingListingId=id;existingMedia=Array.isArray(x.media)?[...x.media]:[];selectedMedia=[];removedMedia=[];
    const values={title:x.title,category:x.category,adType:x.advertType,county:x.county,location:x.town,price:x.price,businessName:x.businessName,description:x.description,phone:x.contactPhone,bedrooms:x.bedrooms,bathrooms:x.bathrooms};
    Object.entries(values).forEach(([name,value])=>{const field=form.elements.namedItem(name);if(field&&value!==undefined&&value!==null)field.value=value;});
    category.dispatchEvent(new Event('change'));Object.entries(x.details||{}).forEach(([name,value])=>{const field=form.elements.namedItem(name);if(field&&value!==undefined)field.value=value;});
    if(x.websiteUrl){const field=form.elements.namedItem('websiteUrl');if(field)field.value=x.websiteUrl;}
    $('uploadStatus').textContent='Editing existing advert. Current media is retained unless you remove it.';
    $('submitListingButton').textContent='Resubmit for review ↗';$('cancelEditButton').hidden=false;$('submitListingButton').textContent='Resubmit for review ↗';form.scrollIntoView({behavior:'smooth',block:'start'});renderMediaPreview();
  }catch(e){alert('Could not open advert for editing: '+e.message);}
}
async function saveListing(intent){
  if(!currentUser){alert('Sign in before saving an advert.');return;}
  if(!currentUser.emailVerified){alert('Please verify your email before creating adverts.');return;}
  if(!form.reportValidity())return;
  const d=new FormData(form),priceValue=Number(d.get('price'));
  const record={
    ownerUid:currentUser.uid,title:String(d.get('title')).trim(),category:String(d.get('category')),
    advertType:String(d.get('adType')),county:String(d.get('county')),town:String(d.get('location')).trim(),
    price:priceValue,currency:'KES',description:String(d.get('description')).trim(),
    contactPhone:String(d.get('phone')).trim(),details:collectDetails(d),
    updatedAt:serverTimestamp(),status:'draft'
  };
  record.businessName=String(d.get('businessName')||'').trim();
  record.websiteUrl=String(d.getAll('websiteUrl').find(v=>String(v).trim())||d.get('bookingLink')||'').trim();
  const bedrooms=d.get('bedrooms'),bathrooms=d.get('bathrooms');
  if(bedrooms!=='')record.bedrooms=Number(bedrooms);if(bathrooms!=='')record.bathrooms=Number(bathrooms);
  try{
    $('uploadStatus').textContent=editingListingId?'Updating your advert…':'Creating your secure advert draft…';
    let listingId=editingListingId;
    if(!listingId){record.photoUrls=[];record.media=[];record.createdAt=serverTimestamp();const listingRef=await addDoc(collection(db,'publicListings'),record);listingId=listingRef.id;}
    else {record.status='draft';record.updatedAt=serverTimestamp();await updateDoc(doc(db,'publicListings',listingId),record);}
    const uploaded=await uploadListingMedia(listingId);
    const media=[...existingMedia,...uploaded];
    const photoUrls=media.filter(m=>m.kind==='image').map(m=>m.url);
    const videoUrls=media.filter(m=>m.kind==='video').map(m=>m.url);
    const patch={media,photoUrls,videoUrls,updatedAt:serverTimestamp()};
    if(intent==='submit'){patch.status='pending';patch.submittedAt=serverTimestamp();}
    patch.coverImagePath=media.find(m=>m.kind==='image')?.storagePath||'';
    await updateDoc(doc(db,'publicListings',listingId),patch);
    for(const old of removedMedia){if(old.storagePath){try{await deleteObject(storageRef(storage,old.storagePath));}catch(err){console.warn('Old media cleanup skipped',err);}}}
    $('uploadStatus').textContent=media.length+' media file(s) saved. '+(intent==='submit'?'Your advert is awaiting moderation.':'Your draft is saved.');
    form.reset();selectedMedia=[];existingMedia=[];removedMedia=[];editingListingId=null;renderMediaPreview();$('submitListingButton').textContent='Submit for review ↗';$('cancelEditButton').hidden=true;document.querySelectorAll('.category-fields').forEach(el=>el.hidden=true);
    await refresh();
  }catch(e){console.error(e);$('uploadStatus').textContent='Could not complete the advert: '+e.message;alert('SkyNest could not save this advert: '+e.message);}
}
form.addEventListener('submit',e=>{e.preventDefault();saveListing('draft');});
$('submitListingButton').addEventListener('click',()=>saveListing('submit'));
$('cancelEditButton').addEventListener('click',()=>{form.reset();selectedMedia=[];existingMedia=[];removedMedia=[];editingListingId=null;$('cancelEditButton').hidden=true;$('submitListingButton').textContent='Submit for review ↗';$('uploadStatus').textContent='Edit cancelled.';renderMediaPreview();document.querySelectorAll('.category-fields').forEach(el=>el.hidden=true);});
$('year').textContent=new Date().getFullYear();

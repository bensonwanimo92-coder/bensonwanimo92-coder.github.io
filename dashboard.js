import { auth, db } from "./firebase-config.js";
import {
  createUserWithEmailAndPassword, onAuthStateChanged, sendEmailVerification,
  signInWithEmailAndPassword, signOut
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import {
  addDoc, collection, getDocs, orderBy, query, serverTimestamp, updateDoc, where
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

const $=id=>document.getElementById(id);
const form=$('listingForm'), authForm=$('authForm');
let currentUser=null;
function status(message){$('authStatus').textContent=message;}
function price(value){return new Intl.NumberFormat('en-KE',{style:'currency',currency:'KES',maximumFractionDigits:0}).format(Number(value)||0);}
function safe(text){return String(text??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function setWorkspace(user){
  currentUser=user;
  $('workspaceName').textContent=user?((user.displayName||user.email?.split('@')[0]||'Advertiser')):'Guest workspace';
  $('workspaceEmail').textContent=user?user.email:'Sign in to manage adverts';
  $('signOutButton').hidden=!user;
  $('authPanel').hidden=!!user;
  if(user){status(user.emailVerified?'Signed in. Your advertiser workspace is ready.':'Signed in, but email verification is still required. Check your inbox.');}
}
async function loadListings(user){
  const body=$('myListingsBody');
  const q=query(collection(db,'publicListings'),where('ownerUid','==',user.uid),orderBy('updatedAt','desc'));
  const snap=await getDocs(q);
  if(snap.empty){body.innerHTML='<tr><td colspan="5">No listings yet. Create your first draft below.</td></tr>';return;}
  body.replaceChildren();
  snap.forEach(doc=>{
    const x=doc.data(),tr=document.createElement('tr');
    const statusLabel=String(x.status||'draft').toUpperCase();
    tr.innerHTML='<td><span class="property-cell"><i class="thumb thumb-house">⌂</i><span><b>'+safe(x.title)+'</b><small>'+safe(x.town)+', '+safe(x.county)+'</small></span></span></td><td>'+safe(x.category)+'</td><td>'+price(x.price)+'</td><td><span class="status">'+safe(statusLabel)+'</span></td><td>'+(x.updatedAt?.toDate?x.updatedAt.toDate().toLocaleDateString():'Just now')+'</td>';
    body.append(tr);
  });
}
async function refresh(){
  if(!currentUser)return;
  await loadListings(currentUser);
  const claim=await currentUser.getIdTokenResult();
  const admin=claim.claims.marketplaceAdmin===true;
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
  try{
    const credential=await createUserWithEmailAndPassword(auth,$('authEmail').value.trim(),$('authPassword').value);
    await sendEmailVerification(credential.user);
    status('Account created. A verification link has been sent to your email. Verify it, then sign in again.');
  }catch(e){status(e.message);}
});
$('resendVerification').addEventListener('click',async()=>{
  try{if(!auth.currentUser)throw new Error('Sign in first.');await sendEmailVerification(auth.currentUser);status('Verification email sent again.');}
  catch(e){status(e.message);}
});
$('signOutButton').addEventListener('click',()=>signOut(auth));
onAuthStateChanged(auth,async user=>{
  setWorkspace(user);
  if(user){$('resendVerification').hidden=user.emailVerified;try{await refresh();}catch(e){console.error(e);$('myListingsBody').innerHTML='<tr><td colspan="5">Could not load listings. Check the marketplace Firestore rules and index.</td></tr>';}}
});
async function saveListing(intent){
  if(!currentUser){alert('Sign in before saving a listing.');return;}
  if(!currentUser.emailVerified){alert('Please verify your email before creating adverts. Check your inbox.');return;}
  if(!form.reportValidity())return;
  const d=new FormData(form);
  const record={
    ownerUid:currentUser.uid,title:String(d.get('title')).trim(),
    category:String(d.get('category')),advertType:String(d.get('adType')),
    county:String(d.get('county')),town:String(d.get('location')).trim(),
    price:Number(d.get('price')),currency:'KES',
    description:String(d.get('description')).trim(),
    contactPhone:String(d.get('phone')).trim(),photoUrls:[],
    status:'draft',createdAt:serverTimestamp(),updatedAt:serverTimestamp()
  };
  const estate=d.get('estate');if(estate)record.estate=String(estate).trim();
  const bedrooms=d.get('bedrooms');if(bedrooms)record.bedrooms=Number(bedrooms);
  const bathrooms=d.get('bathrooms');if(bathrooms)record.bathrooms=Number(bathrooms);
  try{
    const ref=await addDoc(collection(db,'publicListings'),record);
    if(intent==='submit'){
      await updateDoc(ref,{status:'pending',updatedAt:serverTimestamp()});
      alert('Your listing has been submitted for review. It will not appear publicly until approved.');
    }else alert('Draft saved to your SkyNest advertiser account.');
    form.reset();$('listingPreview').hidden=true;await refresh();
  }catch(e){console.error(e);alert('Could not save listing: '+e.message);}
}
form.addEventListener('submit',e=>{e.preventDefault();saveListing('draft');});
$('submitListingButton').addEventListener('click',()=>saveListing('submit'));
$('year').textContent=new Date().getFullYear();

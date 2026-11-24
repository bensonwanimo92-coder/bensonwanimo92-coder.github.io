import {auth,db,storage} from "./firebase-config.js";
import {createUserWithEmailAndPassword,onAuthStateChanged,sendEmailVerification,sendPasswordResetEmail,signInWithEmailAndPassword,signOut} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import {addDoc,collection,getDocs,orderBy,query,serverTimestamp,updateDoc,where} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
import {deleteObject,getDownloadURL,ref as storageRef,uploadBytesResumable} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-storage.js";
const $=id=>document.getElementById(id),form=$('listingForm');let currentUser=null;
const MARKETPLACE_MEDIA_UPLOADS_ENABLED=false;
$('authForm').addEventListener('submit',e=>e.preventDefault());
const say=t=>$('authStatus').textContent=t;
const safe=t=>String(t??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>Number(n)>0?new Intl.NumberFormat('en-KE',{style:'currency',currency:'KES',maximumFractionDigits:0}).format(Number(n)):'Negotiable / contact';
function setUser(u){currentUser=u;$('workspaceName').textContent=u?(u.displayName||u.email?.split('@')[0]||'Advertiser'):'Guest workspace';$('workspaceEmail').textContent=u?u.email:'Sign in to manage adverts';$('signOutButton').hidden=!u;$('authPanel').hidden=!!u&&u.emailVerified;if(u){say(u.emailVerified?'Signed in. You can now create and submit adverts.':'Verify your email before submitting adverts.');$('resendVerification').hidden=u.emailVerified;$('refreshVerification').hidden=u.emailVerified;}}
async function refresh(){if(!currentUser)return;const q=query(collection(db,'publicListings'),where('ownerUid','==',currentUser.uid),orderBy('updatedAt','desc'));const snap=await getDocs(q),body=$('myListingsBody');body.replaceChildren();if(snap.empty){body.innerHTML='<tr><td colspan="5">No adverts yet. Create your first one below.</td></tr>';return;}snap.forEach(d=>{const x=d.data(),tr=document.createElement('tr');tr.innerHTML='<td><b>'+safe(x.title)+'</b><small style="display:block;color:#889388">'+safe(x.town)+' '+safe(x.county)+'</small></td><td>'+safe(x.category)+'</td><td>'+money(x.price)+'</td><td>'+safe(String(x.status||'draft').toUpperCase())+'</td><td>'+(x.updatedAt?.toDate?x.updatedAt.toDate().toLocaleDateString():'Just now')+'</td>';body.append(tr);});}
const authError=e=>{
 const code=String(e?.code||'').replace('auth/','');
 const messages={
  'invalid-email':'That email address is not valid. Check the spelling and try again.',
  'email-already-in-use':'An account already exists for this email. Sign in instead, or use Forgot password.',
  'weak-password':'Choose a stronger password with at least 8 characters.',
  'missing-password':'Enter your password to continue.',
  'invalid-credential':'Email or password is incorrect. Check both, or reset your password.',
  'user-not-found':'No account was found for this email. Create an account first.',
  'wrong-password':'The password is incorrect. Use Forgot password if needed.',
  'too-many-requests':'Too many attempts. Wait a little before trying again.',
  'operation-not-allowed':'Email/password sign-in is disabled in Firebase Authentication. Enable Authentication → Sign-in method → Email/Password in the hello-chuka Firebase project.',
  'unauthorized-domain':'Firebase is blocking this website domain. Add bensonwanimo92-coder.github.io under Firebase Console → Authentication → Settings → Authorized domains, then retry.',
  'invalid-action-code':'That verification or reset link has expired or was already used. Request a fresh email link and try again.',
  'network-request-failed':'Network connection failed. Check your internet and try again.',
  'api-key-not-valid.-please-pass-a-valid-api-key.':'SkyNest Firebase web configuration is invalid. This needs a developer-side configuration fix.'
 };
 return messages[code]||('Authentication failed ('+(e?.code||'unknown')+'). '+(e?.message||'Please try again.'));
};
const setAuthBusy=busy=>{['loginButton','registerButton'].forEach(id=>$(id).disabled=busy);};
$('loginButton').addEventListener('click',async()=>{
 const email=$('authEmail').value.trim(),password=$('authPassword').value;
 if(!$('authForm').reportValidity())return;
 setAuthBusy(true);say('Signing in securely…');
 try{
  const credential=await signInWithEmailAndPassword(auth,email,password);
  await credential.user.reload();
  if(!credential.user.emailVerified){say('You are signed in, but your email is not verified yet. Open the verification email, then tap “I have verified — refresh status”.');$('resendVerification').hidden=false;$('refreshVerification').hidden=false;}
  else say('Signed in successfully. Your SkyNest workspace is ready.');
 }catch(e){say(authError(e));}finally{setAuthBusy(false);}
});
$('registerButton').addEventListener('click',async()=>{
 const email=$('authEmail').value.trim(),password=$('authPassword').value;
 if(!$('authForm').reportValidity())return;
 setAuthBusy(true);say('Creating your secure SkyNest account…');
 try{
  const credential=await createUserWithEmailAndPassword(auth,email,password);
  try{
   await sendEmailVerification(credential.user);
   say('Your customer account has been created. Verify your email using the link we sent before submitting adverts. Public sign-ups do not receive administrator privileges.');
  }catch(mailError){
   say('Your account was created, but the verification email could not be sent ('+(mailError.code||mailError.message)+'). Sign in and use “Resend verification email”.');
   $('resendVerification').hidden=false;
  }
 }catch(e){say(authError(e));}finally{setAuthBusy(false);}
});
$('resendVerification').addEventListener('click',async()=>{
 if(!auth.currentUser){say('Sign in first to resend your verification email.');return;}
 try{await sendEmailVerification(auth.currentUser);say('A fresh verification email has been sent. Check Inbox, Spam and Promotions.');}
 catch(e){say(authError(e));}
});
$('refreshVerification').addEventListener('click',async()=>{
 if(!auth.currentUser){say('Sign in first, then refresh verification status.');return;}
 try{await auth.currentUser.reload();const user=auth.currentUser;setUser(user);if(user.emailVerified){await user.getIdToken(true);await refresh();say('Email verified. Your SkyNest account is active. Your account remains a customer account unless an administrator separately grants a trusted role.');}else say('Email is not verified yet. Open the link in your email, then try again.');}
 catch(e){say(authError(e));}
});
$('signOutButton').addEventListener('click',async()=>{try{await signOut(auth);say('You have signed out.');}catch(e){say(authError(e));}});
const forgot=document.createElement('button');forgot.type='button';forgot.className='text-link';forgot.textContent='Forgot password? Send reset email';forgot.addEventListener('click',async()=>{
 const email=$('authEmail').value.trim();
 if(!email){say('Enter your email address first, then tap Forgot password.');$('authEmail').focus();return;}
 try{await sendPasswordResetEmail(auth,email);say('If an account exists for this email, a password-reset link has been sent. Check Inbox, Spam and Promotions.');}
 catch(e){say(authError(e));}
});
$('authForm').append(forgot);
onAuthStateChanged(auth,async u=>{setUser(u);if(u)try{await refresh();}catch(e){console.error(e);$('myListingsBody').innerHTML='<tr><td colspan="5">Could not load adverts. Check Firestore rules and indexes.</td></tr>';}});
const media=$('mediaFiles'),preview=$('mediaPreview');let objectUrls=[];
media.addEventListener('change',()=>{objectUrls.forEach(URL.revokeObjectURL);objectUrls=[];preview.replaceChildren();const files=[...media.files];if(files.length>8){alert('Please select up to 8 files.');media.value='';return;}for(const f of files){if(f.size>20*1024*1024){alert(f.name+' is larger than 25 MB.');media.value='';preview.replaceChildren();return;}const url=URL.createObjectURL(f);objectUrls.push(url);const item=document.createElement('div');item.className='media-thumb';if(f.type.startsWith('image/')){const im=document.createElement('img');im.src=url;im.alt=f.name;item.append(im);}else{const v=document.createElement('video');v.src=url;v.controls=true;item.append(v);}const label=document.createElement('small');label.textContent=f.name;item.append(label);preview.append(item);}});
async function save(intent){
 if(!currentUser){alert('Sign in before saving an advert.');return;}
 if(!currentUser.emailVerified){alert('Verify your email before submitting adverts.');return;}
 if(!form.reportValidity())return;
 const d=new FormData(form),price=Number(d.get('price')),files=[...(media.files||[])];
 if(!Number.isFinite(price)||price<=0){alert('Enter a positive price or rate in KSh.');return;}
 if(files.length>8){alert('Choose no more than 8 media files.');return;}
 if(files.length&&!MARKETPLACE_MEDIA_UPLOADS_ENABLED){alert('Secure photo and video uploads are not active yet. Firebase Storage rollout must be completed first. Remove selected files to save or submit this advert without media for now.');return;}
 for(const file of files){
  if(file.size>20*1024*1024){alert(file.name+' exceeds the 20 MB upload limit.');return;}
  if(!/^(image\/(jpeg|png|webp)|video\/(mp4|webm|quicktime))$/.test(file.type)){alert(file.name+' is not a supported image or video.');return;}
 }
 const record={ownerUid:currentUser.uid,title:String(d.get('title')).trim(),category:String(d.get('category')),advertType:String(d.get('adType')).trim(),county:String(d.get('county')).trim(),town:String(d.get('location')).trim(),price,currency:'KES',description:String(d.get('description')).trim(),contactPhone:String(d.get('phone')).trim(),photoUrls:[],media:[],videoUrls:[],details:{specifications:String(d.get('specifications')||'').trim(),reference:String(d.get('reference')||'').trim()},status:'draft',createdAt:serverTimestamp(),updatedAt:serverTimestamp()};
 const submitButton=$('submitListingButton'),draftButton=$('saveDraftButton');
 submitButton.disabled=true;draftButton.disabled=true;
 const uploaded=[];
 try{
  const listingRef=await addDoc(collection(db,'publicListings'),record);
  for(let i=0;i<files.length;i++){
   const file=files[i],clean=file.name.replace(/[^a-zA-Z0-9._-]/g,'_').slice(-80),path='listing_media/'+currentUser.uid+'/'+listingRef.id+'/'+Date.now()+'-'+i+'-'+clean;
   const target=storageRef(storage,path),task=uploadBytesResumable(target,file,{contentType:file.type});
   await new Promise((resolve,reject)=>{
    task.on('state_changed',snapshot=>{
     const total=files.reduce((sum,item)=>sum+item.size,0);
     const completed=uploaded.reduce((sum,item)=>sum+item.size,0);
     const current=completed+snapshot.bytesTransferred;
     $('listingPreview').hidden=false;
     $('listingPreview').textContent='Uploading media '+(i+1)+' of '+files.length+' · '+Math.round(total?current/total*100:0)+'%';
    },reject,resolve);
   });
   const url=await getDownloadURL(task.snapshot.ref);
   const item={kind:file.type.startsWith('image/')?'image':'video',storagePath:path,contentType:file.type,size:file.size,name:file.name,url};
   uploaded.push(item);
  }
  const photos=uploaded.filter(item=>item.kind==='image'),videos=uploaded.filter(item=>item.kind==='video');
  const patch={photoUrls:photos.map(item=>item.url),videoUrls:videos.map(item=>item.url),media:uploaded,updatedAt:serverTimestamp()};
  if(intent==='submit')Object.assign(patch,{status:'pending',submittedAt:serverTimestamp()});
  await updateDoc(listingRef,patch);
  alert(intent==='submit'?'Your advert and media have been uploaded and submitted for moderation. It will appear publicly only after approval.':'Your advert draft and media have been saved securely.');
  form.reset();preview.replaceChildren();objectUrls.forEach(URL.revokeObjectURL);objectUrls=[];
  $('listingPreview').hidden=true;await refresh();
 }catch(e){
  console.error(e);
  for(const item of uploaded){try{await deleteObject(storageRef(storage,item.storagePath));}catch(cleanupError){console.warn('Could not remove an incomplete upload:',cleanupError);}}
  $('listingPreview').hidden=false;
  $('listingPreview').textContent='Upload or save failed: '+e.message+' . Your advert has not been submitted for publication.';
  alert('Could not save advert: '+e.message);
 }finally{submitButton.disabled=false;draftButton.disabled=false;}
}
form.addEventListener('submit',e=>{e.preventDefault();save('draft');});$('submitListingButton').addEventListener('click',()=>save('submit'));
$('year').textContent=new Date().getFullYear();
const params=new URLSearchParams(location.search),cat=params.get('category');if(cat&&[...$('categorySelect').options].some(o=>o.value===cat||o.text===cat))$('categorySelect').value=cat;

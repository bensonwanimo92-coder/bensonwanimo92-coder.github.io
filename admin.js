import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import { collection, getDocs, orderBy, query, serverTimestamp, Timestamp, updateDoc, where, doc } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
const $=id=>document.getElementById(id);
let user=null,admin=false;
$('year').textContent=new Date().getFullYear();
$('signOutButton').addEventListener('click',async()=>{await signOut(auth);location.href='advertiser.html';});
onAuthStateChanged(auth,async u=>{
  user=u;
  if(!u){$('accessStatus').textContent='Please sign in with your SkyNest account first.';const a=document.createElement('a');a.href='advertiser.html';a.textContent='Open advertiser sign-in';$('accessPanel').append(a);$('bootstrapButton').hidden=true;return;}
  await checkAccess();
});
async function checkAccess(){
  if(!user)return;
  await user.reload();
  user=auth.currentUser;
  admin=!!user && user.uid==='PN9bC3ZzgSaOK1JjG4TcjCU9Grx1' &&
    user.email==='bensonwanimo92@gmail.com' && user.emailVerified===true;
  if(admin){$('accessStatus').textContent='Administrator access confirmed for the verified initial administrator account.';$('queue').hidden=false;await loadQueue();}
  else{$('accessStatus').textContent='This account is not the verified initial marketplace administrator. Access is restricted.';$('queue').hidden=true;}
}
$('refreshButton').addEventListener('click',loadQueue);
async function loadQueue(){
  if(!admin)return;
  const root=$('reviewCards');root.replaceChildren();$('queueStatus').textContent='Loading pending submissions…';
  try{
    const q=query(collection(db,'publicListings'),where('status','==','pending'),orderBy('createdAt','asc'));
    const snap=await getDocs(q);
    $('queueStatus').textContent=snap.size+' advert(s) awaiting review.';
    if(snap.empty){root.textContent='No adverts are waiting for review.';return;}
    snap.forEach(s=>{
      const x=s.data(),card=document.createElement('article');card.className='panel';
      const title=document.createElement('h2');title.textContent=x.title||'Untitled advert';
      const details=document.createElement('p');details.textContent=[x.category,x.advertType,x.county,x.town,'KSh '+Number(x.price||0).toLocaleString('en-KE'),x.contactPhone].filter(Boolean).join(' · ');
      const description=document.createElement('p');description.textContent=x.description||'';
      const approve=document.createElement('button');approve.className='button dark-button';approve.textContent='Approve and publish';
      const reject=document.createElement('button');reject.className='button';reject.textContent='Reject';
      approve.addEventListener('click',()=>moderate(s.id,'approved'));
      reject.addEventListener('click',()=>moderate(s.id,'rejected'));
      const gallery=document.createElement('div');gallery.style.cssText='display:flex;gap:10px;flex-wrap:wrap;margin:12px 0';
      (Array.isArray(x.photoUrls)?x.photoUrls:[]).forEach(url=>{const image=document.createElement('img');image.src=url;image.alt='Advert photo';image.loading='lazy';image.style.cssText='width:130px;height:95px;object-fit:cover;border-radius:5px';gallery.append(image);});
      (Array.isArray(x.videoUrls)?x.videoUrls:[]).forEach(url=>{const video=document.createElement('video');video.src=url;video.controls=true;video.preload='metadata';video.style.cssText='width:180px;max-height:120px;border-radius:5px';gallery.append(video);});
      card.append(title,details,description);if(gallery.childElementCount)card.append(gallery);card.append(approve,reject);root.append(card);
    });
  }catch(e){$('queueStatus').textContent='Could not load moderation queue: '+e.message;}
}
async function moderate(id,status){
  if(!admin||!user)return;
  try{
    const update={status,reviewedAt:serverTimestamp(),reviewedBy:user.uid,updatedAt:serverTimestamp()};
    if(status==='approved')update.expiresAt=Timestamp.fromDate(new Date(Date.now()+30*24*60*60*1000));
    else update.rejectionReason='Please contact SkyNest support for details.';
    await updateDoc(doc(db,'publicListings',id),update);
    await loadQueue();
  }catch(e){alert('Moderation failed: '+e.message);}
}

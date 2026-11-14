const COOKIE_NAME='skynest_preferences';
function readCookie(){const found=document.cookie.split('; ').find(v=>v.startsWith(COOKIE_NAME+'='));if(!found)return null;try{return JSON.parse(decodeURIComponent(found.split('=').slice(1).join('=')));}catch{return null;}}
function saveCookie(value){document.cookie=COOKIE_NAME+'='+encodeURIComponent(JSON.stringify(value))+'; Max-Age=31536000; Path=/; SameSite=Lax; Secure';}
export function initCookieConsent(){
 const root=document.getElementById('cookieConsentRoot');if(!root||readCookie())return;
 const panel=document.createElement('section');panel.className='cookie-consent';panel.setAttribute('aria-label','Cookie preferences');
 panel.innerHTML='<div class="cookie-copy"><b>Your privacy matters</b><p>SkyNest uses essential cookies for site functionality. Optional analytics and marketing cookies stay off unless you choose to allow them. <a href="privacy.html">Privacy & cookies</a></p></div><div class="cookie-actions"><button type="button" data-choice="reject">Reject optional</button><button type="button" data-choice="preferences">Preferences</button><button type="button" class="cookie-primary" data-choice="accept">Accept all</button></div>';
 root.append(panel);
 const close=choices=>{saveCookie({necessary:true,analytics:!!choices.analytics,marketing:!!choices.marketing,updatedAt:new Date().toISOString()});panel.remove();};
 panel.addEventListener('click',e=>{
   const choice=e.target.closest('[data-choice]')?.dataset.choice;if(!choice)return;
   if(choice==='reject'){close({analytics:false,marketing:false});return;}
   if(choice==='accept'){close({analytics:true,marketing:true});return;}
   const prefs=document.createElement('div');prefs.className='cookie-preferences';
   prefs.innerHTML='<div class="cookie-preferences-card" role="dialog" aria-modal="true" aria-labelledby="cookieTitle"><button type="button" class="cookie-close" aria-label="Close">×</button><h2 id="cookieTitle">Cookie preferences</h2><p>Essential cookies are always active. Choose whether SkyNest may use optional cookies.</p><label><input type="checkbox" checked disabled> Essential cookies <small>Required for security and core functions</small></label><label><input type="checkbox" id="analyticsCookies"> Analytics cookies <small>Help us understand site usage</small></label><label><input type="checkbox" id="marketingCookies"> Marketing cookies <small>Support relevant campaigns and promotions</small></label><button type="button" class="cookie-primary" id="saveCookiePreferences">Save preferences</button></div>';
   root.append(prefs);
   prefs.querySelector('.cookie-close').onclick=()=>prefs.remove();
   prefs.querySelector('#saveCookiePreferences').onclick=()=>{close({analytics:prefs.querySelector('#analyticsCookies').checked,marketing:prefs.querySelector('#marketingCookies').checked});prefs.remove();};
 });
}

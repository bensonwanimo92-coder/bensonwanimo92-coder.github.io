/* SkyNest category interactions and privacy preferences */
const categorySelect=document.querySelector('#advertiseForm select[name="category"]');
document.querySelectorAll('[data-advertise-category]').forEach(link=>{
  link.addEventListener('click',()=>{
    if(categorySelect) categorySelect.value=link.dataset.advertiseCategory;
  });
});
const banner=document.getElementById('cookieBanner');
const settings=document.getElementById('cookieSettings');
const analyticsToggle=document.getElementById('analyticsCookies');
const consentKey='skynest-cookie-consent-v1';
function showCookieBanner(){if(!localStorage.getItem(consentKey))banner?.classList.add('is-visible');}
function hideCookieBanner(){banner?.classList.remove('is-visible');settings?.classList.remove('is-visible');}
function saveCookieChoice(analytics){
  localStorage.setItem(consentKey,JSON.stringify({necessary:true,analytics:!!analytics,updatedAt:new Date().toISOString()}));
  hideCookieBanner();
}
document.getElementById('acceptAllCookies')?.addEventListener('click',()=>saveCookieChoice(true));
document.getElementById('essentialCookiesOnly')?.addEventListener('click',()=>saveCookieChoice(false));
document.getElementById('openCookieSettings')?.addEventListener('click',()=>{
  const saved=JSON.parse(localStorage.getItem(consentKey)||'{}');
  if(analyticsToggle)analyticsToggle.checked=!!saved.analytics;
  settings?.classList.add('is-visible');
});
document.getElementById('footerCookieSettings')?.addEventListener('click',()=>{
  const saved=JSON.parse(localStorage.getItem(consentKey)||'{}');
  if(analyticsToggle)analyticsToggle.checked=!!saved.analytics;
  settings?.classList.add('is-visible');
});
document.getElementById('saveCookieSettings')?.addEventListener('click',()=>saveCookieChoice(!!analyticsToggle?.checked));
document.getElementById('cancelCookieSettings')?.addEventListener('click',()=>settings?.classList.remove('is-visible'));
settings?.addEventListener('click',e=>{if(e.target===settings)settings.classList.remove('is-visible');});
showCookieBanner();

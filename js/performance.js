window.ORPI_CACHE={get(k){const d=localStorage.getItem(`orpi_${k}`);const t=localStorage.getItem(`orpi_${k}_time`);if(!d||!t)return null;if(Date.now()-parseInt(t)>300000)return null;try{return JSON.parse(d)}catch(e){return null}},set(k,v){localStorage.setItem(`orpi_${k}`,JSON.stringify(v));localStorage.setItem(`orpi_${k}_time`,Date.now().toString())},clear(k){localStorage.removeItem(`orpi_${k}`);localStorage.removeItem(`orpi_${k}_time`)}};
if('serviceWorker'in navigator&&location.protocol==='https:'){window.addEventListener('load',()=>{navigator.serviceWorker.register('/sw.js').catch(()=>{})});}
const observer=new IntersectionObserver((entries)=>{entries.forEach(entry=>{if(entry.isIntersecting){const img=entry.target;if(img.dataset.src){img.src=img.dataset.src;delete img.dataset.src;observer.unobserve(img)}}})},{rootMargin:'50px'});
document.addEventListener('DOMContentLoaded',()=>{document.querySelectorAll('img[data-src]').forEach(img=>observer.observe(img))});


import { species, zones, events } from '../data/ocean';

type Plan = { date:string; mood:string; zones:string[]; events:string[]; found:string[]; adults:number; children:number };
const storageKey='pelagos:plan:v1';
const today=()=>{const date=new Date();return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;};
const allowedSlugs=new Set(species.map(animal=>animal.slug));
const allowedZones=new Set(zones.map(zone=>zone.id));
const allowedEvents=new Set(events.map(event=>event.id));
const list=(value:unknown,allowed:Set<string>)=>Array.isArray(value)?[...new Set(value.filter((entry):entry is string=>typeof entry==='string'&&allowed.has(entry)))]:[];
const count=(value:unknown,min:number,max:number,fallback:number)=>typeof value==='number'&&Number.isInteger(value)?Math.max(min,Math.min(max,value)):fallback;
let storageAvailable=true;
let plan:Plan={date:today(),mood:'',zones:[],events:[],found:[],adults:2,children:0};
try{
  const saved=JSON.parse(localStorage.getItem(storageKey)||'null');
  if(saved&&typeof saved==='object')plan={date:typeof saved.date==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(saved.date)&&saved.date>=today()?saved.date:today(),mood:['Вся семья','В своём ритме','За новыми знаниями'].includes(saved.mood)?saved.mood:'',zones:list(saved.zones,allowedZones),events:list(saved.events,allowedEvents),found:list(saved.found,allowedSlugs),adults:count(saved.adults,1,6,2),children:count(saved.children,0,6,0)};
}catch{storageAvailable=false;}
function persist(){try{localStorage.setItem(storageKey,JSON.stringify(plan));}catch{storageAvailable=false;}}
function render(){
  document.querySelectorAll<HTMLButtonElement>('[data-found]').forEach(button=>{const selected=plan.found.includes(button.dataset.found!);button.setAttribute('aria-pressed',String(selected));const label=button.querySelector('[data-found-label]');if(label)label.textContent=selected?'В дневнике ✓':button.classList.contains('journal-toggle')?'Отметить в дневнике':'Отметить';});
  document.querySelectorAll('[data-journal-count]').forEach(el=>el.textContent=`${plan.found.length}/${species.length}`);
  document.querySelectorAll<HTMLButtonElement>('[data-route-zone]').forEach(button=>{const selected=plan.zones.includes(button.dataset.routeZone!);button.setAttribute('aria-pressed',String(selected));const label=button.querySelector('[data-route-label]');if(label)label.textContent=selected?'В маршруте ✓':'Добавить в маршрут';});
  document.querySelectorAll('[data-route-summary]').forEach(el=>el.textContent=plan.zones.length?zones.filter(zone=>plan.zones.includes(zone.id)).map(zone=>zone.name).join(' → '):'Выберите интересующие залы.');
  document.querySelectorAll<HTMLButtonElement>('[data-event]').forEach(button=>{const selected=plan.events.includes(button.dataset.event!);button.setAttribute('aria-pressed',String(selected));const label=button.querySelector('[data-event-label]');if(label)label.textContent=selected?'В плане ✓':'В мой план';});
  document.querySelectorAll<HTMLButtonElement>('[data-mood]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.mood===plan.mood)));
  document.querySelectorAll<HTMLElement>('[data-plan-zone]').forEach(el=>el.hidden=!plan.zones.includes(el.dataset.planZone!));
  document.querySelectorAll<HTMLElement>('[data-plan-event]').forEach(el=>el.hidden=!plan.events.includes(el.dataset.planEvent!));
  document.querySelectorAll<HTMLElement>('[data-plan-zones-empty]').forEach(el=>el.hidden=plan.zones.length>0);
  document.querySelectorAll<HTMLElement>('[data-plan-events-empty]').forEach(el=>el.hidden=plan.events.length>0);
  document.querySelectorAll('[data-storage-status]').forEach(el=>el.textContent=storageAvailable?'Дневник сохраняется на этом устройстве.':'Браузер не разрешил сохранение. Выбор действует до перезагрузки страницы.');
}
function toggle(list:string[],value:string){return list.includes(value)?list.filter(item=>item!==value):[...list,value];}
document.querySelectorAll<HTMLButtonElement>('[data-found]').forEach(button=>button.addEventListener('click',()=>{const slug=button.dataset.found!;if(!allowedSlugs.has(slug))return;plan.found=toggle(plan.found,slug);persist();render();}));
document.querySelectorAll<HTMLButtonElement>('[data-route-zone]').forEach(button=>button.addEventListener('click',()=>{const id=button.dataset.routeZone!;if(!allowedZones.has(id))return;plan.zones=toggle(plan.zones,id);persist();render();}));
document.querySelectorAll<HTMLButtonElement>('[data-event]').forEach(button=>button.addEventListener('click',()=>{const id=button.dataset.event!;if(!allowedEvents.has(id))return;plan.events=toggle(plan.events,id);persist();render();document.querySelectorAll('[data-event-status]').forEach(el=>el.textContent=plan.events.includes(id)?'Встреча добавлена в план визита.':'Встреча убрана из плана.');}));
document.querySelectorAll<HTMLButtonElement>('[data-mood]').forEach(button=>button.addEventListener('click',()=>{plan.mood=button.dataset.mood!;persist();render();}));
document.querySelectorAll<HTMLInputElement>('[data-visit-date]').forEach(input=>{input.min=today();input.value=plan.date;input.addEventListener('change',()=>{if(input.validity.valid&&input.value){plan.date=input.value;persist();document.querySelectorAll<HTMLInputElement>('[data-visit-date]').forEach(other=>other.value=plan.date);}});});

const catalog=document.querySelector('[data-catalog]');
if(catalog){
  const search=catalog.querySelector<HTMLInputElement>('[data-search]')!;let group='Все';
  const normalize=(text:string)=>text.toLocaleLowerCase('ru').replaceAll('ё','е');
  const filter=()=>{let visible=0;catalog.querySelectorAll<HTMLElement>('[data-species-card]').forEach(card=>{const match=normalize(card.dataset.searchText||'').includes(normalize(search.value.trim()))&&(group==='Все'||card.dataset.group===group);card.hidden=!match;if(match)visible++;});catalog.querySelector('[data-result-count]')!.textContent=`Найдено: ${visible}`;catalog.querySelector<HTMLElement>('[data-catalog-empty]')!.hidden=visible>0;};
  search.addEventListener('input',filter);
  catalog.querySelectorAll<HTMLButtonElement>('[data-filter]').forEach(button=>button.addEventListener('click',()=>{group=button.dataset.filter!;catalog.querySelectorAll('[data-filter]').forEach(item=>item.setAttribute('aria-pressed',String(item===button)));filter();}));
}
const map=document.querySelector('[data-map]');
if(map){
  const selectZone=(id:string)=>{if(!allowedZones.has(id))return;map.querySelectorAll<HTMLElement>('[data-zone]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.zone===id)));map.querySelectorAll<HTMLElement>('[data-zone-panel]').forEach(el=>el.hidden=el.dataset.zonePanel!==id);const url=new URL(location.href);url.searchParams.set('zone',id);history.replaceState(null,'',url);};
  map.querySelectorAll<HTMLElement>('[data-zone]').forEach(el=>{el.addEventListener('click',()=>selectZone(el.dataset.zone!));if(el.tagName.toLowerCase()==='g')el.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();selectZone(el.dataset.zone!);}});});
  const requested=new URLSearchParams(location.search).get('zone');if(requested&&allowedZones.has(requested))selectZone(requested);
}

const ticketForm=document.querySelector<HTMLFormElement>('[data-ticket-form]');
if(ticketForm){
  const adults=ticketForm.querySelector<HTMLSelectElement>('[data-ticket-adults]')!;const children=ticketForm.querySelector<HTMLSelectElement>('[data-ticket-children]')!;
  adults.value=String(plan.adults);children.value=String(plan.children);
  const updateTotal=()=>{const total=Number(adults.value)*1200+Number(children.value)*800;ticketForm.querySelector('output')!.textContent=new Intl.NumberFormat('ru-RU',{style:'currency',currency:'RUB',maximumFractionDigits:0}).format(total);};
  adults.addEventListener('change',updateTotal);children.addEventListener('change',updateTotal);updateTotal();
  ticketForm.addEventListener('submit',event=>{event.preventDefault();if(!ticketForm.reportValidity())return;plan.adults=Number(adults.value);plan.children=Number(children.value);persist();ticketForm.querySelector('[data-ticket-status]')!.textContent=storageAvailable?'План сохранён на этом устройстве. Билет не оформлялся.':'План выбран. Браузер не разрешил сохранение; скачайте его файлом.';});
  ticketForm.querySelector('[data-download-plan]')!.addEventListener('click',()=>{const rows=['ПЕЛАГОС — МОЙ ПЛАН','Демонстрационный план вымышленного океанариума. Не является билетом.',`Дата: ${plan.date}`,`Взрослые: ${adults.value}; дети: ${children.value}`,`Настроение: ${plan.mood||'Не выбрано'}`,'Залы:',...zones.filter(zone=>plan.zones.includes(zone.id)).map(zone=>`• ${zone.name}`),'Встречи:',...events.filter(event=>plan.events.includes(event.id)).map(event=>`• ${event.time} — ${event.title}`)];const objectUrl=URL.createObjectURL(new Blob([rows.join('\n')],{type:'text/plain;charset=utf-8'}));const link=document.createElement('a');link.href=objectUrl;link.download='pelagos-plan.txt';link.click();setTimeout(()=>URL.revokeObjectURL(objectUrl),1000);});
}

document.querySelectorAll<HTMLButtonElement>('[data-dialog]').forEach(button=>button.addEventListener('click',()=>{const dialog=document.getElementById(button.dataset.dialog!);if(dialog instanceof HTMLDialogElement){dialog.showModal();document.body.classList.add('dialog-open');const title=dialog.querySelector<HTMLElement>('[id]');if(title){title.tabIndex=-1;title.focus();}}}));
document.querySelectorAll<HTMLDialogElement>('dialog').forEach(dialog=>{dialog.querySelector('[data-close]')?.addEventListener('click',()=>dialog.close());dialog.addEventListener('close',()=>document.body.classList.remove('dialog-open'));dialog.addEventListener('click',event=>{const rect=dialog.getBoundingClientRect();if(event.target===dialog&&(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom))dialog.close();});});
render();

const motionQuery=matchMedia('(prefers-reduced-motion: reduce)');
let motionPaused=motionQuery.matches;
const renderMotion=()=>{document.documentElement.dataset.motionPaused=String(motionPaused);document.querySelectorAll<HTMLButtonElement>('[data-scene-pause]').forEach(button=>{button.disabled=motionQuery.matches;button.setAttribute('aria-pressed',String(motionPaused));const label=button.querySelector('[data-motion-label]');if(label)label.textContent=motionQuery.matches?'Без анимации':motionPaused?'Продолжить движение':'Остановить движение';});window.dispatchEvent(new CustomEvent('pelagos:pause',{detail:motionPaused}));};
document.querySelectorAll('[data-scene-pause]').forEach(button=>button.addEventListener('click',()=>{motionPaused=!motionPaused;renderMotion();}));
motionQuery.addEventListener('change',()=>{motionPaused=motionQuery.matches;renderMotion();});renderMotion();

// «Глубина»: the page scroll is the descent. Each chapter is a stop; between them the depth interpolates.
const descent=document.querySelector<HTMLElement>('[data-descent]');
if(descent){
  const stops=[...descent.querySelectorAll<HTMLElement>('[data-descent-stop]')];
  const meters=[0,150,700,2000];
  const readout=descent.querySelector('[data-depth-meters]');
  let frame=0,last=-1;
  const update=()=>{
    frame=0;const anchor=innerHeight*.5;
    const centers=stops.map(stop=>{const rect=stop.getBoundingClientRect();return rect.top+rect.height*.5;});
    let level=0;
    if(centers.length){if(anchor>=centers[centers.length-1])level=centers.length-1;else for(let i=0;i<centers.length-1;i++){if(anchor>=centers[i]&&anchor<centers[i+1]){level=i+(anchor-centers[i])/(centers[i+1]-centers[i]);break;}}}
    if(Math.abs(level-last)<.001)return;last=level;
    const i=Math.min(meters.length-2,Math.floor(level)),t=level-i;
    const depth=Math.round((meters[i]+(meters[i+1]-meters[i])*t)/10)*10;
    descent.style.setProperty('--descent',String(level/(stops.length-1)));
    document.documentElement.dataset.descent=String(level);
    if(readout)readout.textContent=`${depth.toLocaleString('ru-RU')} м`;
    window.dispatchEvent(new CustomEvent('pelagos:descent',{detail:level}));
  };
  const schedule=()=>{if(!frame)frame=requestAnimationFrame(update);};
  addEventListener('scroll',schedule,{passive:true});addEventListener('resize',schedule,{passive:true});update();
}

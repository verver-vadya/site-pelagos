import {species} from '../data/ocean';

// Every public page of the concept; the prototype and model studio are working tools, not pages.
const pages=['','depth/','inhabitants/',...species.map(animal=>`inhabitants/${animal.slug}/`),'map/','schedule/','visit/','journal/','care/','about/','credits/'];

export function GET({site}:{site:URL}){
 const base=new URL(import.meta.env.BASE_URL.replace(/\/?$/,'/'),site);
 const body=`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages.map(page=>` <url><loc>${new URL(page,base).href}</loc></url>`).join('\n')}\n</urlset>\n`;
 return new Response(body,{headers:{'Content-Type':'application/xml; charset=utf-8'}});
}

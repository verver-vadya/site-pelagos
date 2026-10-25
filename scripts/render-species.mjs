// Renders the atlas card images: each animal in the home scene's water (src/components/HabitatStudio.tsx).
// Start `npm run dev` first, then: node scripts/render-species.mjs  → PNG files in .species-renders/ (convert to WebP, 1296×960).
import {chromium} from 'playwright';
import {mkdirSync} from 'node:fs';
const models=['manta','shark','tuna','kingfish','sardine','turtle','octopus','jelly'];
mkdirSync('.species-renders',{recursive:true});
const browser=await chromium.launch();
for(const model of models){
 const page=await browser.newPage({viewport:{width:1296,height:960}});
 await page.goto(`http://127.0.0.1:4321/habitat-studio/${model}/`);
 await page.waitForTimeout(25000);
 await page.screenshot({path:`.species-renders/${model}.png`});
 await page.close();
}
await browser.close();

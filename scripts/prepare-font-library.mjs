// Rebuild the bundled, self-hosted catalog from the official Fontsource npm packages.
import { mkdir, readFile, writeFile, rm, copyFile, readdir } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
const exec = promisify(execFile);
const groups = {
  'Sans empattement': 'Roboto|Open Sans|Lato|Poppins|Inter|Nunito|Nunito Sans|Manrope|DM Sans|Outfit|Work Sans|Raleway|Ubuntu|Mulish|Quicksand|Rubik|Barlow|Barlow Condensed|Oswald|Source Sans 3|PT Sans|Figtree|Plus Jakarta Sans|Space Grotesk|Urbanist|Josefin Sans|Karla|Assistant|Archivo|Exo 2|Lexend|Libre Franklin|Public Sans|Red Hat Display|IBM Plex Sans',
  'Avec empattement': 'Playfair Display|Lora|Merriweather|Cormorant Garamond|Libre Baskerville|DM Serif Display|Bodoni Moda|Crimson Pro|EB Garamond|Source Serif 4|PT Serif|Spectral|Vollkorn|Bitter|Cardo|Arvo',
  'Manuscrite': 'Dancing Script|Great Vibes|Pacifico|Allura|Sacramento|Satisfy|Caveat|Kalam|Patrick Hand|Parisienne',
  'Affichage': 'Bebas Neue|Anton|Abril Fatface|Righteous|Fredoka|Alfa Slab One',
  'Monospace': 'Space Mono|Roboto Mono|IBM Plex Mono|JetBrains Mono|Fira Code',
  'Arabe': 'Cairo|Tajawal|Amiri|Noto Sans Arabic|Noto Naskh Arabic|Changa',
};
const root=path.resolve('public/fonts'), temp=path.resolve('tests/.font-download');
await mkdir(root,{recursive:true});await mkdir(temp,{recursive:true});
const pending=Object.entries(groups).flatMap(([category,names])=>names.split('|').map(family=>({family,category,id:family.toLowerCase().replaceAll(' ','-')})));
const catalog=[{family:'Montserrat',id:'montserrat',category:'Sans empattement',faces:[]},{family:'Moontime',id:'moontime',category:'Manuscrite',faces:[]}];
async function worker(){
  while(pending.length){
    const font=pending.shift(), dest=path.join(root,font.id);
    await mkdir(dest,{recursive:true});
    const packed=JSON.parse((await exec('npm',['pack','@fontsource/'+font.id,'--json','--pack-destination',temp],{maxBuffer:4e6})).stdout)[0];
    const archive=path.join(temp,packed.filename), unpack=path.join(temp,font.id);
    await mkdir(unpack,{recursive:true});
    await exec('tar',['-xzf',archive,'-C',unpack]);
    const files=await readdir(path.join(unpack,'package/files'));
    const chosen=files.filter(f=>/-(latin|latin-ext|arabic)-(400|700)-normal\.woff2$/.test(f));
    if(!chosen.length)throw Error('Aucune police compatible : '+font.family);
    font.faces=[];
    const ranges={latin:'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD','latin-ext':'U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0300-0303,U+0305-0307,U+0309-0328,U+032A-036F,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF',arabic:'U+0600-06FF,U+0750-077F,U+0870-089F,U+08A0-08FF,U+200C-200F,U+204F,U+2E41,U+FB50-FDFF,U+FE70-FEFF,U+10E60-10E7F,U+10EC0-10EFF,U+1EE00-1EEFF'};
    for(const file of chosen){
      const [,subset,weight]=file.match(/-(latin|latin-ext|arabic)-(400|700)-normal\.woff2$/);
      await copyFile(path.join(unpack,'package/files',file),path.join(dest,file));
      font.faces.push({src:'/fonts/'+font.id+'/'+file,weight:Number(weight),range:ranges[subset]});
    }
    await copyFile(path.join(unpack,'package/LICENSE'),path.join(dest,'LICENSE.txt'));
    font.package='@fontsource/'+font.id+'@'+packed.version;
    catalog.push(font);await rm(unpack,{recursive:true});await rm(archive);
    console.log('Police préparée : '+font.family);
  }
}
await Promise.all(Array.from({length:6},worker));
catalog.sort((a,b)=>a.family.localeCompare(b.family));
await writeFile('lib/font-catalog.mjs','// Bundled assets: Fontsource. Individual licenses live in public/fonts/<family>/LICENSE.txt.\nexport const fontCatalog = '+JSON.stringify(catalog,null,2)+';\nexport const catalogFont = (name) => fontCatalog.find(font => font.family === name);\n');
await rm(temp,{recursive:true});console.log(catalog.length+' familles disponibles.');

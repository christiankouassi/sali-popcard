// Local QA only. No production database, SMTP service or real payments.
import { PGlite } from '@electric-sql/pglite';
import { createServer as postgresServer } from 'pglite-server';
import { createServer, request } from 'node:http';
import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { randomUUID, randomBytes, createHash } from 'node:crypto';
import bcrypt from 'bcryptjs';

const db = new PGlite();
await db.waitReady;
await db.exec(await readFile('scripts/schema.sql', 'utf8'));
const roles = {};
const users = {};
for (const [role, name] of [['client', 'Nadia — compte de démonstration'], ['admin', 'SALI — équipe de démonstration']]) {
  const id = randomUUID(), secret = randomBytes(32).toString('hex');
  await db.query('INSERT INTO users(id,email,name,password_hash,is_admin,verified_at,profile) VALUES($1,$2,$3,$4,$5,now(),$6)', [id, role+'@example.com', name, await bcrypt.hash(randomBytes(24).toString('hex'), 4), role==='admin', {billing_name: 'Nadia Bennani', address: '12 rue de démonstration, Casablanca'}]);
  await db.query("INSERT INTO sessions(token_hash,user_id,expires_at) VALUES($1,$2,now()+interval '1 day')", [createHash('sha256').update(secret).digest('hex'), id]);
  roles[role] = secret;
  users[role] = id;
}
const demoLogo=randomUUID();
await db.query('INSERT INTO files(id,user_id,name,mime,bytes) VALUES($1,$2,$3,$4,$5)',[demoLogo,users.client,'SALI-DigiCom.svg','image/svg+xml',await readFile('public/assets/logo-white-crop.svg')]);
await db.query('INSERT INTO cards(id,user_id,slug,data,logo_id) VALUES($1,$2,$3,$4,$5)',[
  'e2c75f19-f997-4a0c-bca2-000000000250',users.client,'demonstration-250',
  {tpl:'B',designVersion:2,primary:'#173E35',accent:'#44B68A',background:'#FCFBF6',firstName:'Nadia',lastName:'Bennani',company:'SALI DigiCom',title:'Direction commerciale',city:'Casablanca',desc:'Faisons connaissance. Retrouvez mes coordonnées et mes liens utiles.',address:'',website:'https://example.com',whatsapp:'+212600000000',instagram:'',linkedin:'',facebook:'',lang:'fr',fontTitle:'Montserrat',fontBody:'Montserrat',phones:[['Mobile','+212600000000']],emails:['nadia@example.com'],show:{desc:true,phones:true,emails:true,whatsapp:true,website:true,address:true,social:true},logoTile:false},demoLogo
]);
const pg = postgresServer(db);
await new Promise(resolve => pg.listen(55433, '127.0.0.1', resolve));
const standalone = process.argv.includes('--standalone');
const app = spawn(process.execPath, standalone ? ['dist/server.js'] : ['node_modules/next/dist/bin/next','dev','--webpack','--hostname','127.0.0.1','--port','4180'], {
  stdio: 'inherit', env: {...process.env, PORT:'4180', HOSTNAME:'127.0.0.1', POPCARD_TEST_SERIAL_DB:'true', DATABASE_URL:'postgresql://postgres@127.0.0.1:55433/postgres', APP_URL:'http://terminal.local:4173', MAIL_MODE:'log', POPCARD_ORDERS_ENABLED:'true', POPCARD_BANK_HOLDER:'DÉMONSTRATION — aucun virement réel', POPCARD_BANK_RIB:'DEMO-0000', POPCARD_BANK_NAME:'Banque de démonstration'}
});
let failedWrites = 0;
const proxy = createServer((req, res) => {
  const url = new URL(req.url, 'http://terminal.local:4173');
  if (url.pathname === '/qa') {
    res.setHeader('Content-Type','text/html; charset=utf-8');
    res.end('<!doctype html><html lang="fr"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Recette PopCard</title><body style="font:18px system-ui;background:#f6f8f3;padding:40px;color:#173e35"><h1>Recette PopCard</h1><p>Données fictives, emails locaux et paiements simulés.</p><p><a href="/qa-enter?role=client">Ouvrir le parcours client</a></p><p><a href="/qa-enter?role=admin">Ouvrir le parcours de l’équipe SALI</a></p><p><a href="/">Voir l’accueil</a></p></body></html>'); return;
  }
  if (url.pathname === '/qa-enter') {
    const role = url.searchParams.get('role') === 'admin' ? 'admin' : 'client';
    res.writeHead(302, {'Set-Cookie':`popcard_session=${roles[role]}; HttpOnly; SameSite=Lax; Path=/`, Location:role==='admin'?'/app/admin':'/app'}); res.end(); return;
  }
  if (url.pathname === '/qa-fail-save') {
    failedWrites=1; res.writeHead(302,{Location:'/app/cards/new'}); res.end(); return;
  }
  if (url.pathname === '/qa-screen') {
    const width = Math.max(320, Math.min(1920, Number(url.searchParams.get('width'))||390));
    const height = Math.max(480, Math.min(1200, Number(url.searchParams.get('height'))||844));
    const path = url.searchParams.get('path') || '/';
    if (!/^\/(?:app(?:\/|$)|$)/.test(path) || /[<>"&]/.test(path)) {res.writeHead(400);res.end();return;}
    res.setHeader('Content-Type','text/html; charset=utf-8');
    res.end(`<!doctype html><html lang="fr"><meta name="viewport" content="width=device-width,initial-scale=1"><title>PopCard — écran ${width} × ${height}</title><body style="margin:0;background:#dce5d6;display:grid;justify-content:center"><iframe title="Écran de test" src="${path}" width="${width}" height="${height}" style="border:0;background:white"></iframe></body></html>`); return;
  }
  if (failedWrites && req.method==='POST' && /^\/api\/cards(?:\/[^/]+)?$/.test(url.pathname)) {
    failedWrites--; res.writeHead(503, {'Content-Type':'application/json'});res.end(JSON.stringify({error:'Interruption réseau simulée pour la recette.'}));return;
  }
  const upstream = request({hostname:'127.0.0.1',port:4180,path:req.url,method:req.method,headers:{...req.headers,host:'terminal.local:4173','x-forwarded-proto':'http'}}, response => {
    const headers={...response.headers};
    // Only this disposable QA proxy allows its own responsive-screen iframe.
    delete headers['x-frame-options'];
    if (headers['content-security-policy']) headers['content-security-policy']=headers['content-security-policy'].replace("frame-ancestors 'none'","frame-ancestors 'self'");
    res.writeHead(response.statusCode,headers); response.pipe(res);
  });
  upstream.on('error',()=>{res.writeHead(503);res.end('Préparation de la prévisualisation…');});
  req.pipe(upstream);
});
proxy.listen(4173, '0.0.0.0',()=>console.log('Recette isolée : http://terminal.local:4173/qa'));
function stop(){app.kill('SIGTERM');proxy.close();pg.close();setTimeout(()=>process.exit(),500).unref();}
process.on('SIGTERM',stop);process.on('SIGINT',stop);
app.on('exit',()=>process.exit());

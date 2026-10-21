import {SMTPServer} from 'smtp-server';
import {appendFileSync,writeFileSync} from 'node:fs';
// Les messages reçus sont conservés pour que les tests lisent les liens réellement envoyés.
const outbox='tests/.smtp-outbox.txt';writeFileSync(outbox,'');
const server=new SMTPServer({disabledCommands:['STARTTLS'],onAuth(auth,session,callback){callback(null,{user:'test'});},onData(stream,session,callback){let message='';stream.on('data',chunk=>message+=chunk);stream.on('end',()=>{if(!message.includes('Subject:'))return callback(Error('Message invalide'));appendFileSync(outbox,message+'\n=====\n');callback();});}});
server.listen(2526,'127.0.0.1',()=>console.log('SMTP de test local prêt.'));process.on('SIGTERM',()=>server.close(()=>process.exit()));

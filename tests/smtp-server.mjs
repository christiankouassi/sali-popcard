import {SMTPServer} from 'smtp-server';
const server=new SMTPServer({disabledCommands:['STARTTLS'],onAuth(auth,session,callback){callback(null,{user:'test'});},onData(stream,session,callback){let message='';stream.on('data',chunk=>message+=chunk);stream.on('end',()=>{if(!message.includes('Subject:'))return callback(Error('Message invalide'));callback();});}});
server.listen(2526,'127.0.0.1',()=>console.log('SMTP de test local prêt.'));process.on('SIGTERM',()=>server.close(()=>process.exit()));

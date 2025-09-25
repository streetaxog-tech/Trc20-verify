// server.js
const express = require('express');
const bodyParser = require('body-parser');
const WebSocket = require('ws');
const app = express();
app.use(bodyParser.json());
const PORT = process.env.PORT || 4000;

const requests = {};
let sockets = [];

const wss = new WebSocket.Server({ noServer: true });
wss.on('connection', ws => {
  sockets.push(ws);
  ws.on('close', ()=>sockets=sockets.filter(s=>s!==ws));
});

app.post('/admin/request',(req,res)=>{
  const {userAddress,amount,recipient} = req.body;
  if(!userAddress || !amount || !recipient) return res.status(400).json({ok:false,error:'missing'});
  const id='req_'+Date.now();
  requests[id]={id,userAddress,amount,recipient,status:'requested'};
  const payload={type:'transfer_request',data:requests[id]};
  sockets.forEach(s=>{try{s.send(JSON.stringify(payload));}catch(e){}});
  res.json({ok:true,id});
});

app.post('/request/:id/tx',(req,res)=>{
  const {id}=req.params;
  const {txHash}=req.body;
  if(!requests[id]) return res.status(404).send('notfound');
  requests[id].txHash=txHash;
  requests[id].status='pending';
  console.log('Transaction received:',id,txHash);
  res.json({ok:true});
});

const server = app.listen(PORT,()=>console.log('Server running on',PORT));
server.on('upgrade',(req,socket,head)=>{
  wss.handleUpgrade(req,socket,head,ws=>wss.emit('connection',ws,req));
});

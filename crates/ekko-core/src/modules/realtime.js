// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────

(function(){
function createRealtime(opts){
  opts=opts||{};
  const channels=new Map();
  const sockets=new Map();

  
  const rooms=new Map();   
  function roomSet(room){let s=rooms.get(room);if(!s){s=new Set();rooms.set(room,s);}return s;}
  let socketId=0;
  function channel(name,handlers){
    channels.set(name,{name,handlers:handlers||{},members:new Set()});
    return rt;
  }
  function handleConnection(ws,path){
    const id=++socketId;
    const sock={id,ws,_path:path,_rooms:new Set(),
      send(data){ws.send(typeof data==='string'?data:JSON.stringify(data));},
      join(room){sock._rooms.add(room);roomSet(room).add(id);const ch=channels.get(room);if(ch)ch.members.add(id);},
      leave(room){sock._rooms.delete(room);const rs=rooms.get(room);if(rs)rs.delete(id);const ch=channels.get(room);if(ch)ch.members.delete(id);},
      broadcast(event,data,excludeSelf){
        for(const room of sock._rooms){
          const mem=rooms.get(room);if(!mem)continue;
          for(const mid of mem){if(excludeSelf!==false&&mid===id)continue;const ms=sockets.get(mid);if(ms)ms.send(JSON.stringify({event,data}));}
        }
      },
      to(room){return{emit(event,data){const mem=rooms.get(room);if(!mem)return;for(const mid of mem){const ms=sockets.get(mid);if(ms)ms.send(JSON.stringify({event,data}));}}}},
    };
    sockets.set(id,sock);
    const ch=channels.get(path);
    
    sock._rooms.add(path);roomSet(path).add(id);
    if(ch){
      ch.members.add(id);
      if(ch.handlers.join)ch.handlers.join(sock);
    }
    
    ws.on('message',(data)=>{if(ch&&ch.handlers.message)ch.handlers.message(sock,typeof data==='string'?data:data);});
    ws.on('close',()=>{

      for(const room of sock._rooms){const rs=rooms.get(room);if(rs)rs.delete(id);const rch=channels.get(room);if(rch)rch.members.delete(id);}
      sockets.delete(id);
      if(ch&&ch.handlers.leave)ch.handlers.leave(sock);
    });
    return sock;
  }
  const rt={
    channel,
    handleConnection,
    getChannel(name){return channels.get(name)||null;},
    getSocket(id){return sockets.get(id)||null;},
    broadcast(event,data){for(const[,s]of sockets)s.send(JSON.stringify({event,data}));},
    channelCount(){return channels.size;},
    socketCount(){return sockets.size;},
  };
  return rt;
}
return {createRealtime};
})()
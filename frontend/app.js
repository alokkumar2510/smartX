// ═══════════════════════════════════════════════════════════
// SmartChat X Ultra — Frontend Application Logic
// WebRTC P2P + Blockchain + Chart.js Dashboard
// ═══════════════════════════════════════════════════════════

// ── CANVAS BACKGROUND ──
const canvas=document.getElementById('bg-canvas'),ctx=canvas.getContext('2d');
let W,H,bgParts=[],streams=[];
function resize(){W=canvas.width=innerWidth;H=canvas.height=innerHeight}
resize();addEventListener('resize',resize);
for(let i=0;i<100;i++)bgParts.push({x:Math.random()*2000-200,y:Math.random()*1200-100,r:Math.random()*1.2+.3,pulse:Math.random()*Math.PI*2,da:Math.random()*.008+.002});
const chars='01アイウエオSCXTCPUDP0xFFP2P⛓️'.split('');
for(let i=0;i<25;i++)streams.push({x:Math.random()*2200,y:Math.random()*-1000,speed:Math.random()*1.5+.4,chars:Array.from({length:Math.floor(Math.random()*10+4)},()=>chars[Math.floor(Math.random()*chars.length)]),alpha:Math.random()*.15+.04,ct:0});
function drawBg(){ctx.clearRect(0,0,W,H);ctx.strokeStyle='rgba(0,245,255,0.025)';ctx.lineWidth=1;for(let x=0;x<W;x+=60){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke()}for(let y=0;y<H;y+=60){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke()}bgParts.forEach(p=>{p.pulse+=p.da;const a=(Math.sin(p.pulse)+1)*.5*.6+.1;ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fillStyle=`rgba(0,245,255,${a*.7})`;ctx.fill()});ctx.font='11px "Share Tech Mono"';streams.forEach(s=>{s.y+=s.speed;if(s.y>H+200){s.y=-200;s.x=Math.random()*W}s.ct++;if(s.ct>20){s.ct=0;s.chars[Math.floor(Math.random()*s.chars.length)]=chars[Math.floor(Math.random()*chars.length)]}s.chars.forEach((c,i)=>{ctx.fillStyle=`rgba(0,245,255,${s.alpha*(1-i/s.chars.length*.9)})`;ctx.fillText(c,s.x,s.y-i*14)})});requestAnimationFrame(drawBg)}
drawBg();

// ── CLOCK ──
function updateClock(){const n=new Date();document.getElementById('clock').textContent=String(n.getHours()).padStart(2,'0')+':'+String(n.getMinutes()).padStart(2,'0')+':'+String(n.getSeconds()).padStart(2,'0')}
setInterval(updateClock,1000);updateClock();

// ── PARTICLES ──
function burst(x,y,color='#00f5ff'){for(let i=0;i<12;i++){const p=document.createElement('div');p.className='particle';const a=Math.random()*Math.PI*2,d=Math.random()*60+20;p.style.cssText=`left:${x}px;top:${y}px;background:${color};--tx:translate(${Math.cos(a)*d}px,${Math.sin(a)*d}px)`;document.body.appendChild(p);setTimeout(()=>p.remove(),800)}}

// ── STATE ──
let ws=null,username='',isTyping=false,typingTimer=null;
let dashboardInterval=null,tcpMsgCount=0,udpMsgCount=0,p2pMsgCount=0;
const onlineUsers=new Set();
const COLORS=['#00f5ff','#ff00aa','#00ff88','#ffaa00','#a855f7','#3b82f6','#f97316'];
function colorFor(n){let h=0;for(let c of n)h=(h*31+c.charCodeAt(0))&0xffffffff;return COLORS[Math.abs(h)%COLORS.length]}
function initials(n){return n.slice(0,2).toUpperCase()}
function nowStr(){const d=new Date();return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0')+':'+String(d.getSeconds()).padStart(2,'0')}

// ── STATUS ──
function setStatus(state,text){const c=document.getElementById('status-chip'),s=document.getElementById('status-text');c.className='stat-chip '+state;s.textContent=text}
function showToast(msg){const t=document.getElementById('toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),3500)}
function showXP(amount,reason){const el=document.getElementById('xp-popup');el.textContent=`+${amount} XP — ${reason}`;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),2000)}
function showBadge(badge){const el=document.getElementById('badge-popup');el.innerHTML=`<div class="badge-icon">${badge.icon}</div><div class="badge-name">${badge.name}</div><div class="badge-desc">${badge.desc}</div>`;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),3000)}

// ── TABS ──
function switchTab(tab){document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));document.querySelectorAll('.tab-content').forEach(t=>t.classList.remove('active'));document.querySelector(`[data-tab="${tab}"]`).classList.add('active');document.getElementById('tab-'+tab).classList.add('active');if(['dashboard','network','cluster','game','blockchain','webrtc'].includes(tab))requestDashboard()}

// ── CHART.JS ──
let protoChart=null,timelineChart=null;const timelineData={labels:[],tcp:[],udp:[]};
function initCharts(){
  const darkGrid={color:'rgba(255,255,255,0.04)'};const darkTick={color:'rgba(255,255,255,0.3)',font:{family:'Share Tech Mono',size:9}};
  protoChart=new Chart(document.getElementById('chart-protocol'),{type:'doughnut',data:{labels:['TCP','UDP','HYBRID'],datasets:[{data:[0,0,0],backgroundColor:['rgba(0,200,255,0.6)','rgba(255,0,170,0.6)','rgba(255,170,0,0.6)'],borderColor:['rgba(0,200,255,0.9)','rgba(255,0,170,0.9)','rgba(255,170,0,0.9)'],borderWidth:2}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{labels:{color:'rgba(255,255,255,0.5)',font:{family:'Share Tech Mono',size:9}}}}}});
  timelineChart=new Chart(document.getElementById('chart-timeline'),{type:'line',data:{labels:[],datasets:[{label:'TCP Msgs',data:[],borderColor:'rgba(0,245,255,0.8)',backgroundColor:'rgba(0,245,255,0.1)',fill:true,tension:.4,pointRadius:2},{label:'UDP Events',data:[],borderColor:'rgba(255,0,170,0.8)',backgroundColor:'rgba(255,0,170,0.1)',fill:true,tension:.4,pointRadius:2}]},options:{responsive:true,maintainAspectRatio:false,scales:{x:{grid:darkGrid,ticks:darkTick},y:{grid:darkGrid,ticks:darkTick}},plugins:{legend:{labels:{color:'rgba(255,255,255,0.5)',font:{family:'Share Tech Mono',size:9}}}}}});
}

// ── MESSAGES ──
function appendMsg(text,kind,senderName,extra={}){
  const box=document.getElementById('messages'),wrap=document.createElement('div');
  wrap.className='msg '+kind;
  if(extra.blocked)wrap.classList.add('blocked');if(extra.packetLost)wrap.classList.add('packet-lost');
  if(kind!=='system'&&kind!=='study'&&kind!=='blocked'&&kind!=='packet-lost'&&senderName){
    const meta=document.createElement('div');meta.className='msg-meta';const col=colorFor(senderName);
    let badges='';
    if(extra.protocol){const cls=extra.protocol==='TCP'?'tcp-badge':'udp-badge';badges+=`<span class="route-badge ${cls}">${extra.protocol}</span>`}
    if(extra.encrypted)badges+='<span class="enc-badge">🔐 AES</span>';
    if(extra.blockHash)badges+=`<span class="bc-badge">⛓️ #${extra.blockIndex}</span>`;
    meta.innerHTML=`<span class="sender" style="color:${col}">${kind==='self'?username:senderName}</span><span class="ts">${nowStr()}</span>${badges}`;
    wrap.appendChild(meta);
  }
  const bub=document.createElement('div');bub.className='bubble';bub.textContent=text;
  wrap.appendChild(bub);box.appendChild(wrap);box.scrollTop=box.scrollHeight;
}

function parseServerMsg(raw){const cm=raw.match(/^\[(.+?)\]: (.+)$/);if(cm){const sender=cm[1],text=cm[2];if(sender.toLowerCase()===username.toLowerCase())return;addOnlineUser(sender);appendMsg(text,'other',sender,{protocol:'TCP',encrypted:true});return}appendMsg(raw,'system');const jm=raw.match(/\[SERVER\] (.+?) has joined/),lm=raw.match(/\[SERVER\] (.+?) has left/);if(jm)addOnlineUser(jm[1]);if(lm)removeOnlineUser(lm[1])}

// ── ONLINE LIST ──
function updateCount(){document.getElementById('user-count').textContent=onlineUsers.size}
function addOnlineUser(name){if(onlineUsers.has(name))return;onlineUsers.add(name);updateCount();const li=document.createElement('li');const col=colorFor(name);const isMe=name.toLowerCase()===username.toLowerCase();li.dataset.user=name;li.innerHTML=`<div class="av" style="background:${col}18;border:1px solid ${col}44;color:${col}">${initials(name)}</div><span class="uname">${name}</span>${isMe?'<span class="you-tag">YOU</span>':''}`;document.getElementById('online-list').appendChild(li)}
function removeOnlineUser(name){onlineUsers.delete(name);updateCount();const el=document.querySelector(`#online-list [data-user="${name}"]`);if(el){el.style.animation='userIn .3s reverse forwards';setTimeout(()=>el.remove(),300)}}
function setTypingBar(text){const bar=document.getElementById('typing-bar');if(text)bar.innerHTML=`<div class="typing-dots"><span></span><span></span><span></span></div>${text}`;else bar.innerHTML=''}
function showSmartReplies(replies){const bar=document.getElementById('smart-replies');bar.innerHTML='';if(!replies||!replies.length)return;replies.forEach(r=>{const btn=document.createElement('button');btn.className='smart-reply-btn';btn.textContent=r;btn.onclick=()=>{document.getElementById('msg-input').value=r;bar.innerHTML='';sendMessage()};bar.appendChild(btn)})}

// ── INPUT EVENTS ──
document.addEventListener('DOMContentLoaded',()=>{
  document.getElementById('msg-input').addEventListener('input',()=>{if(!ws)return;if(!isTyping){isTyping=true;ws.send(JSON.stringify({type:'typing'}))}clearTimeout(typingTimer);typingTimer=setTimeout(()=>{isTyping=false;ws.send(JSON.stringify({type:'stopped'}))},1500)});
  document.getElementById('msg-input').addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMessage()}});
  document.getElementById('username-input').addEventListener('keydown',e=>{if(e.key==='Enter')joinChat()});
  document.getElementById('p2p-input').addEventListener('keydown',e=>{if(e.key==='Enter')sendP2PMessage()});
  initNetworkPresets();initCharts();
});

// ── JOIN ──
function joinChat(){
  const inp=document.getElementById('username-input');const name=inp.value.trim();
  if(!name){inp.focus();inp.style.borderColor='var(--red)';setTimeout(()=>inp.style.borderColor='',800);return}
  username=name;
  document.getElementById('connecting-overlay').classList.add('show');document.getElementById('join-btn').disabled=true;setStatus('connecting','CONNECTING');
  try{ws=new WebSocket('ws://localhost:8765')}catch(e){document.getElementById('connecting-overlay').classList.remove('show');showToast('WebSocket not supported');return}
  ws.onopen=()=>setStatus('connecting','HANDSHAKE');
  ws.onmessage=e=>{
    const data=JSON.parse(e.data);
    switch(data.type){
      case 'prompt':ws.send(JSON.stringify({type:'username',text:username}));document.getElementById('connecting-overlay').classList.remove('show');document.getElementById('login-screen').style.display='none';const cs=document.getElementById('chat-screen');cs.style.display='flex';cs.classList.add('active');setStatus('live','ONLINE');addOnlineUser(username);appendMsg(`⚡ SESSION INITIATED — OPERATOR "${username}" ONLINE`,'system');document.getElementById('msg-input').focus();dashboardInterval=setInterval(requestDashboard,5000);break;
      case 'session_info':handleSessionInfo(data);break;
      case 'message':handleIncomingMessage(data);break;
      case 'message_processed':handleMessageProcessed(data);break;
      case 'message_blocked':appendMsg(`🚫 ${data.text} (${data.reason})`,'blocked');showToast('Message blocked');break;
      case 'packet_lost':appendMsg(`📡 PACKET LOST — ${data.simulation.condition}`,'packet-lost');break;
      case 'typing':handleTypingEvent(data);break;
      case 'queued_messages':if(data.count>0){appendMsg(`📬 ${data.count} queued messages delivered`,'system');data.messages.forEach(m=>appendMsg(`[Queued] ${m.sender}: ${m.text}`,'other',m.sender))}break;
      case 'dashboard_data':updateDashboard(data);break;
      case 'leaderboard':updateLeaderboard(data.data);break;
      case 'profile':updateProfile(data.data);break;
      case 'network_condition_updated':document.getElementById('nq-score').textContent=Math.round(data.condition.quality_score||100);showToast(`Network: ${data.condition.name||'Normal'}`);break;
      case 'blockchain_data':renderBlockchain(data.data);break;
      case 'chain_validation':renderValidation(data.data);break;
      case 'tamper_result':renderValidation(data.validation);showToast('⚠️ Block tampered! Run validation to detect.');break;
      case 'peer_list':updatePeerList(data.peers);break;
      case 'webrtc_offer':handleWebRTCOffer(data);break;
      case 'webrtc_answer':handleWebRTCAnswer(data);break;
      case 'webrtc_ice':handleWebRTCICE(data);break;
      case 'pong_latency':break;
      case 'error':document.getElementById('connecting-overlay').classList.remove('show');showToast(data.text);setStatus('offline','ERROR');document.getElementById('join-btn').disabled=false;break;
      case 'system':appendMsg(data.text,'system');break;
    }
  };
  ws.onclose=()=>{setStatus('offline','OFFLINE');appendMsg('⚠️ LINK TERMINATED','system');clearInterval(dashboardInterval)};
  ws.onerror=()=>{document.getElementById('connecting-overlay').classList.remove('show');setStatus('offline','ERROR');showToast('Cannot connect — is run_all.py running?');document.getElementById('join-btn').disabled=false};
}

// ── HANDLERS ──
function handleSessionInfo(data){
  appendMsg(`🔐 Encryption: ${data.encryption.algorithm} | Session: ${data.encryption.session_id}`,'system');
  if(data.assigned_node&&data.assigned_node.assigned)appendMsg(`🌍 Assigned to: ${data.assigned_node.node_name}`,'system');
  if(data.blockchain)document.getElementById('chain-length').textContent=data.blockchain.chain_length;
}
function handleIncomingMessage(data){tcpMsgCount++;document.getElementById('tcp-count').textContent=tcpMsgCount;parseServerMsg(data.text||'')}
function handleMessageProcessed(data){
  if(data.routing)document.getElementById('tcp-count').textContent=++tcpMsgCount;
  if(data.ai&&data.ai.smart_replies)showSmartReplies(data.ai.smart_replies);
  if(data.study_response)appendMsg(data.study_response.content,'study',null);
  if(data.blockchain){document.getElementById('chain-length').textContent=data.blockchain.block_index+1}
  if(data.gamification){const g=data.gamification;if(g.xp&&g.xp.xp_gained>0)showXP(g.xp.xp_gained,g.xp.reason);if(g.xp&&g.xp.leveled_up)appendMsg(`🎉 LEVEL UP! Level ${g.xp.level}!`,'system');if(g.new_badges)g.new_badges.forEach(b=>showBadge(b))}
}
function handleTypingEvent(data){const m=(data.text||'').match(/\[STATUS\] (.+)/);udpMsgCount++;document.getElementById('udp-count').textContent=udpMsgCount;if(m){setTypingBar(m[1]);clearTimeout(window._tc);window._tc=setTimeout(()=>setTypingBar(''),3000)}}

// ── SEND ──
function sendMessage(){if(!ws||ws.readyState!==WebSocket.OPEN)return;const inp=document.getElementById('msg-input');const text=inp.value.trim();if(!text)return;appendMsg(text,'self',username,{protocol:'TCP',encrypted:true});ws.send(JSON.stringify({type:'message',text}));ws.send(JSON.stringify({type:'stopped'}));isTyping=false;clearTimeout(typingTimer);inp.value='';inp.focus();document.getElementById('smart-replies').innerHTML='';const btn=document.querySelector('.send-btn');const r=btn.getBoundingClientRect();burst(r.left+r.width/2,r.top+r.height/2,'#00f5ff')}
function leaveChat(){if(ws){ws.send(JSON.stringify({type:'message',text:'/quit'}));setTimeout(()=>ws.close(),300)}document.getElementById('chat-screen').classList.remove('active');document.getElementById('chat-screen').style.display='none';document.getElementById('login-screen').style.display='flex';document.getElementById('online-list').innerHTML='';document.getElementById('messages').innerHTML='';onlineUsers.clear();updateCount();setStatus('offline','OFFLINE');username='';document.getElementById('join-btn').disabled=false;document.getElementById('username-input').value='';clearInterval(dashboardInterval);tcpMsgCount=0;udpMsgCount=0;p2pMsgCount=0}

// ── DASHBOARD ──
function requestDashboard(){if(ws&&ws.readyState===WebSocket.OPEN){ws.send(JSON.stringify({type:'get_dashboard'}));ws.send(JSON.stringify({type:'get_leaderboard'}));ws.send(JSON.stringify({type:'get_profile'}));ws.send(JSON.stringify({type:'get_blockchain'}))}}
function updateDashboard(data){
  if(data.routing){const r=data.routing;document.getElementById('total-routed');
    if(protoChart){protoChart.data.datasets[0].data=[r.tcp_percentage||0,r.udp_percentage||0,r.hybrid_percentage||0];protoChart.update()}
    // Timeline
    const now=nowStr();timelineData.labels.push(now);timelineData.tcp.push(tcpMsgCount);timelineData.udp.push(udpMsgCount);if(timelineData.labels.length>20){timelineData.labels.shift();timelineData.tcp.shift();timelineData.udp.shift()}
    if(timelineChart){timelineChart.data.labels=timelineData.labels;timelineChart.data.datasets[0].data=timelineData.tcp;timelineChart.data.datasets[1].data=timelineData.udp;timelineChart.update()}
    const logBody=document.getElementById('routing-log-body');logBody.innerHTML='';(r.recent_decisions||[]).reverse().forEach(d=>{const div=document.createElement('div');div.className='routing-entry';div.innerHTML=`<span class="re-proto ${d.protocol}">${d.protocol}</span><span>${d.message_type}</span><span class="re-reason">${d.reason}</span>`;logBody.appendChild(div)});
  }
  if(data.ai){document.getElementById('ai-processed').textContent=data.ai.messages_processed;document.getElementById('ai-blocked').textContent=data.ai.messages_blocked;document.getElementById('ai-block-rate').textContent=data.ai.block_rate+'%'}
  if(data.encryption){document.getElementById('enc-sessions').textContent=data.encryption.active_sessions;document.getElementById('enc-count').textContent=data.encryption.encrypted_messages;document.getElementById('enc-algo').textContent=data.encryption.algorithm}
  if(data.queue){document.getElementById('q-total').textContent=data.queue.total_queued;document.getElementById('q-delivered').textContent=data.queue.total_delivered;document.getElementById('q-pending').textContent=data.queue.pending_messages}
  if(data.analytics){document.getElementById('an-total').textContent=data.analytics.total_messages;document.getElementById('an-users').textContent=data.analytics.unique_users;document.getElementById('an-avg-len').textContent=data.analytics.avg_message_length}
  if(data.network_sim){const ns=data.network_sim;document.getElementById('ns-total').textContent=ns.total_packets;document.getElementById('ns-dropped').textContent=ns.dropped_packets;document.getElementById('ns-drop-rate').textContent=ns.drop_rate+'%';document.getElementById('ns-avg-delay').textContent=ns.avg_delay_ms+'ms';document.getElementById('net-quality-val').textContent=Math.round(ns.quality_score)+'%';document.getElementById('nq-score').textContent=Math.round(ns.quality_score)}
  if(data.cluster)updateCluster(data.cluster);
  if(data.plugins)updatePluginList(data.plugins);
}

// ── BLOCKCHAIN ──
function refreshBlockchain(){if(ws)ws.send(JSON.stringify({type:'get_blockchain'}))}
function validateChain(){if(ws)ws.send(JSON.stringify({type:'validate_chain'}))}
function tamperDemo(){if(ws)ws.send(JSON.stringify({type:'tamper_demo',block_index:1,new_message:'HACKED!'}))}
function renderBlockchain(data){
  if(!data)return;
  document.getElementById('chain-length').textContent=data.chain_length;
  // Stats
  const stats=document.getElementById('bc-stats');
  stats.innerHTML=`<div class="dash-stat">Blocks<span>${data.chain_length}</span></div><div class="dash-stat">Difficulty<span>${data.difficulty}</span></div><div class="dash-stat">Avg Nonce<span>${data.avg_nonce}</span></div><div class="dash-stat">Valid<span>${data.valid?'✅ YES':'❌ NO'}</span></div>`;
  // Chain
  const chain=document.getElementById('bc-chain');chain.innerHTML='';
  const blocks=data.recent_blocks||[];
  blocks.forEach((b,i)=>{
    const isGenesis=b.data.type==='genesis';
    const div=document.createElement('div');
    div.className=`bc-block ${isGenesis?'genesis':'message'}`;
    div.innerHTML=`<div class="bc-block-header"><span class="bc-block-index">BLOCK #${b.index}</span><span class="bc-block-time">${b.time_str}</span><span class="bc-block-nonce">Nonce: ${b.nonce}</span></div><div class="bc-block-data">${isGenesis?'🌐 GENESIS BLOCK':`💬 ${b.data.sender}: ${b.data.message}`}</div><div class="bc-block-hash">Hash: <span>${b.hash}</span></div><div class="bc-block-hash">Prev: ${b.previous_hash.substring(0,24)}...</div>`;
    chain.appendChild(div);
    if(i<blocks.length-1){const link=document.createElement('div');link.className='bc-chain-link';link.textContent='⬇ 🔗 ⬇';chain.appendChild(link)}
  });
}
function renderValidation(data){
  const el=document.getElementById('bc-validation');
  if(data.valid){el.className='bc-validation valid';el.textContent=`${data.status} — ${data.blocks_checked} blocks verified, no tampering detected.`}
  else{el.className='bc-validation invalid';el.innerHTML=`${data.status} — ${data.errors.length} error(s) found!<br>${data.errors.map(e=>`Block #${e.block}: ${e.error}`).join('<br>')}`}
}

// ── CLUSTER ──
function updateCluster(cluster){const container=document.getElementById('cluster-nodes');container.innerHTML='';Object.entries(cluster.nodes||{}).forEach(([id,node])=>{const card=document.createElement('div');card.className=`node-card ${node.status}`;const cpuCol=node.cpu_usage>80?'var(--red)':node.cpu_usage>50?'var(--amber)':'var(--green)';const memCol=node.memory_usage>80?'var(--red)':node.memory_usage>50?'var(--amber)':'var(--green)';card.innerHTML=`<div class="node-name">${node.name}</div><span class="node-status ${node.status}">${node.status.toUpperCase()}</span><div class="node-metric"><span>CPU</span><span style="color:${cpuCol}">${node.cpu_usage}%</span></div><div class="node-bar"><div class="node-bar-fill" style="width:${node.cpu_usage}%;background:${cpuCol}"></div></div><div class="node-metric"><span>Memory</span><span style="color:${memCol}">${node.memory_usage}%</span></div><div class="node-bar"><div class="node-bar-fill" style="width:${node.memory_usage}%;background:${memCol}"></div></div><div class="node-metric"><span>Connections</span><span>${node.current_connections}/${node.capacity}</span></div><div class="node-metric"><span>Response</span><span>${node.response_time_ms}ms</span></div><div class="node-actions">${node.status!=='down'?`<button class="node-btn danger" onclick="simulateNodeFailure('${id}')">⚠ FAIL</button>`:`<button class="node-btn" onclick="recoverNode('${id}')">🔄 RECOVER</button>`}</div>`;container.appendChild(card)});
  const stats=document.getElementById('cluster-stats-panel');stats.innerHTML=`<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:10px;font-family:var(--font-mono);font-size:9px"><div class="dash-stat">Utilization<span>${cluster.utilization}%</span></div><div class="dash-stat">Total Routed<span>${cluster.total_routed}</span></div><div class="dash-stat">Failovers<span>${cluster.failover_count}</span></div></div>`}
function simulateNodeFailure(id){if(ws)ws.send(JSON.stringify({type:'simulate_node_failure',node_id:id}));setTimeout(requestDashboard,500)}
function recoverNode(id){if(ws)ws.send(JSON.stringify({type:'recover_node',node_id:id}));setTimeout(requestDashboard,500)}
function changeLBAlgo(){if(ws)ws.send(JSON.stringify({type:'set_lb_algorithm',algorithm:document.getElementById('lb-algo').value}))}

// ── NETWORK SIMULATOR ──
function initNetworkPresets(){const presets=[{id:'disable',name:'🟢 Normal'},{id:'perfect',name:'⚡ Perfect'},{id:'good_wifi',name:'📶 Good WiFi'},{id:'mobile_4g',name:'📱 4G'},{id:'poor_wifi',name:'📉 Poor WiFi'},{id:'congested',name:'🚧 Congested'},{id:'satellite',name:'🛰️ Satellite'},{id:'chaos',name:'🔥 Chaos!'}];const container=document.getElementById('net-presets');presets.forEach(p=>{const btn=document.createElement('button');btn.className='preset-btn';btn.textContent=p.name;btn.dataset.preset=p.id;btn.onclick=()=>{document.querySelectorAll('.preset-btn').forEach(b=>b.classList.remove('active'));btn.classList.add('active');if(ws)ws.send(JSON.stringify({type:'set_network_condition',preset:p.id}))};container.appendChild(btn)})}
function updateNetSliders(){document.getElementById('pl-val').textContent=document.getElementById('sl-packet-loss').value+'%';document.getElementById('lat-val').textContent=document.getElementById('sl-latency').value+'ms';document.getElementById('jit-val').textContent=document.getElementById('sl-jitter').value+'ms';document.getElementById('cong-val').textContent=document.getElementById('sl-congestion').value+'%'}
function applyCustomNetwork(){if(!ws)return;ws.send(JSON.stringify({type:'set_network_condition',custom:{packet_loss:document.getElementById('sl-packet-loss').value/100,latency_ms:parseInt(document.getElementById('sl-latency').value),jitter_ms:parseInt(document.getElementById('sl-jitter').value),congestion:document.getElementById('sl-congestion').value/100}}))}
function resetNetwork(){if(ws)ws.send(JSON.stringify({type:'set_network_condition',preset:'disable'}));document.querySelectorAll('.preset-btn').forEach(b=>b.classList.remove('active'));['sl-packet-loss','sl-latency','sl-jitter','sl-congestion'].forEach(id=>document.getElementById(id).value=0);updateNetSliders()}

// ── PLUGINS ──
function updatePluginList(pluginsData){const container=document.getElementById('plugin-list');container.innerHTML='';(pluginsData.plugins||[]).forEach(p=>{const div=document.createElement('div');div.className='plugin-item';div.innerHTML=`<span>${p.name}</span><div class="plugin-toggle ${p.enabled?'on':''}" onclick="togglePlugin('${p.name}')"></div>`;container.appendChild(div)})}
function togglePlugin(name){if(ws)ws.send(JSON.stringify({type:'toggle_plugin',plugin_name:name}));setTimeout(requestDashboard,500)}

// ── GAMIFICATION ──
function updateProfile(data){if(!data)return;const card=document.getElementById('profile-card');const col=colorFor(data.username||username);const progress=Math.round((data.progress||0)*100);card.innerHTML=`<div class="profile-header"><div class="profile-avatar" style="background:${col}18;border-color:${col};color:${col}">${initials(data.username||username)}</div><div class="profile-info"><div class="profile-name">${data.username||username}</div><div class="profile-level">LEVEL ${data.level||1}</div></div></div><div class="xp-bar"><div class="xp-bar-fill" style="width:${progress}%"></div></div><div class="xp-text">${data.xp||0} XP · ${data.xp_to_next||0} to next (${progress}%)</div><div class="profile-stats"><div class="p-stat"><div class="p-stat-val">${data.level||1}</div><div class="p-stat-label">LEVEL</div></div><div class="p-stat"><div class="p-stat-val">${data.xp||0}</div><div class="p-stat-label">XP</div></div><div class="p-stat"><div class="p-stat-val">${data.message_count||0}</div><div class="p-stat-label">MSGS</div></div><div class="p-stat"><div class="p-stat-val">${(data.badges||[]).length}</div><div class="p-stat-label">BADGES</div></div></div>`;
  const allBadges=[{id:'first_message',name:'First Contact',icon:'🌟',desc:'Sent first message'},{id:'chat_10',name:'Chatterbox',icon:'💬',desc:'10 messages'},{id:'chat_50',name:'Communicator',icon:'📡',desc:'50 messages'},{id:'ai_user',name:'AI Whisperer',icon:'🧠',desc:'Used AI'},{id:'encrypted',name:'Crypto Agent',icon:'🔐',desc:'Encryption used'},{id:'level_5',name:'Veteran',icon:'⚡',desc:'Level 5'},{id:'level_10',name:'Legend',icon:'👑',desc:'Level 10'},{id:'network_wizard',name:'Network Wizard',icon:'🌐',desc:'Used simulator'},{id:'speed_demon',name:'Speed Demon',icon:'🏎️',desc:'5 msgs in 10s'},{id:'night_owl',name:'Night Owl',icon:'🦉',desc:'After midnight'}];
  const earned=data.badges||[];const bSection=document.getElementById('badges-section');bSection.innerHTML='<div class="dash-title">🏅 Badges</div><div class="badges-grid" id="badges-grid"></div>';const grid=document.getElementById('badges-grid');allBadges.forEach(b=>{const isEarned=earned.includes(b.id);const div=document.createElement('div');div.className=`badge-item ${isEarned?'earned':'locked'}`;div.innerHTML=`<span class="badge-emoji">${b.icon}</span><div class="badge-info"><div class="badge-bname">${b.name}</div><div class="badge-bdesc">${b.desc}</div></div>`;grid.appendChild(div)})}
function updateLeaderboard(data){if(!data)return;const container=document.getElementById('leaderboard-list');container.innerHTML='';data.forEach((p,i)=>{const rankClass=i===0?'gold':i===1?'silver':i===2?'bronze':'';const row=document.createElement('div');row.className='lb-row';row.innerHTML=`<span class="lb-rank ${rankClass}">#${p.rank}</span><span class="lb-name">${p.username}</span><span class="lb-badges">${(p.badge_icons||[]).join('')}</span><span class="lb-level">Lv.${p.level}</span><span class="lb-xp">${p.xp} XP</span>`;container.appendChild(row)})}

// ══════════════════════════════════════════════════════════
// WEBRTC P2P COMMUNICATION
// ══════════════════════════════════════════════════════════
const peerConnections={};const dataChannels={};let activePeer=null;
const rtcConfig={iceServers:[{urls:'stun:stun.l.google.com:19302'},{urls:'stun:stun1.l.google.com:19302'}]};

function webrtcLog(msg,type='signal'){const log=document.getElementById('webrtc-log');const div=document.createElement('div');div.className='log-entry '+type;div.textContent=`[${nowStr()}] ${msg}`;log.appendChild(div);log.scrollTop=log.scrollHeight}

function updatePeerList(peers){
  const container=document.getElementById('webrtc-peer-list');container.innerHTML='';
  peers.filter(p=>p!==username).forEach(peer=>{
    const isConnected=!!dataChannels[peer];
    const div=document.createElement('div');div.className='peer-item';
    div.innerHTML=`<span class="peer-name">${peer}</span><span class="peer-status">${isConnected?'● P2P':'○ Available'}</span><button class="peer-connect-btn ${isConnected?'connected':''}" onclick="${isConnected?`disconnectPeer('${peer}')`:`connectToPeer('${peer}')`}">${isConnected?'Disconnect':'Connect P2P'}</button>`;
    container.appendChild(div)});
  updateActiveConnections();
}

function updateActiveConnections(){
  const container=document.getElementById('webrtc-connections');container.innerHTML='';
  Object.keys(dataChannels).forEach(peer=>{const div=document.createElement('div');div.className='peer-item';div.innerHTML=`<span class="peer-name">🟢 ${peer}</span><span class="peer-status">P2P Active</span>`;container.appendChild(div)})
}

async function connectToPeer(target){
  webrtcLog(`Initiating P2P to ${target}...`);
  const pc=new RTCPeerConnection(rtcConfig);
  peerConnections[target]=pc;
  const dc=pc.createDataChannel('chat');
  setupDataChannel(dc,target);
  pc.onicecandidate=ev=>{if(ev.candidate)ws.send(JSON.stringify({type:'webrtc_ice',target,candidate:ev.candidate.toJSON()}))};
  pc.onconnectionstatechange=()=>{webrtcLog(`Connection to ${target}: ${pc.connectionState}`,pc.connectionState==='connected'?'p2p':'signal')};
  const offer=await pc.createOffer();await pc.setLocalDescription(offer);
  ws.send(JSON.stringify({type:'webrtc_offer',target,sdp:offer.sdp}));
  webrtcLog(`Offer sent to ${target}`,'signal');
}

async function handleWebRTCOffer(data){
  const sender=data.sender;webrtcLog(`Offer received from ${sender}`,'signal');
  const pc=new RTCPeerConnection(rtcConfig);peerConnections[sender]=pc;
  pc.ondatachannel=ev=>setupDataChannel(ev.channel,sender);
  pc.onicecandidate=ev=>{if(ev.candidate)ws.send(JSON.stringify({type:'webrtc_ice',target:sender,candidate:ev.candidate.toJSON()}))};
  pc.onconnectionstatechange=()=>{webrtcLog(`Connection from ${sender}: ${pc.connectionState}`,pc.connectionState==='connected'?'p2p':'signal')};
  await pc.setRemoteDescription(new RTCSessionDescription({type:'offer',sdp:data.sdp}));
  const answer=await pc.createAnswer();await pc.setLocalDescription(answer);
  ws.send(JSON.stringify({type:'webrtc_answer',target:sender,sdp:answer.sdp}));
  webrtcLog(`Answer sent to ${sender}`,'signal');
}

async function handleWebRTCAnswer(data){
  const sender=data.sender;webrtcLog(`Answer received from ${sender}`,'signal');
  const pc=peerConnections[sender];if(pc)await pc.setRemoteDescription(new RTCSessionDescription({type:'answer',sdp:data.sdp}))
}

async function handleWebRTCICE(data){
  const sender=data.sender;const pc=peerConnections[sender];
  if(pc&&data.candidate){try{await pc.addIceCandidate(new RTCIceCandidate(data.candidate));webrtcLog(`ICE candidate from ${sender}`,'signal')}catch(e){webrtcLog(`ICE error: ${e.message}`,'error')}}
}

function setupDataChannel(dc,peer){
  dc.onopen=()=>{dataChannels[peer]=dc;activePeer=peer;webrtcLog(`✅ DataChannel OPEN with ${peer}`,'p2p');p2pMsgCount++;document.getElementById('p2p-count').textContent=Object.keys(dataChannels).length;updateActiveConnections();appendMsg(`📞 P2P DataChannel established with ${peer}`,'system');showToast(`P2P connected: ${peer}`)};
  dc.onmessage=ev=>{const msg=JSON.parse(ev.data);appendP2PMsg(msg.text,msg.sender,'received');p2pMsgCount++};
  dc.onclose=()=>{delete dataChannels[peer];webrtcLog(`DataChannel closed with ${peer}`,'signal');document.getElementById('p2p-count').textContent=Object.keys(dataChannels).length;updateActiveConnections()};
}

function sendP2PMessage(){
  const inp=document.getElementById('p2p-input');const text=inp.value.trim();if(!text)return;
  Object.entries(dataChannels).forEach(([peer,dc])=>{
    if(dc.readyState==='open'){dc.send(JSON.stringify({text,sender:username}));appendP2PMsg(text,username,'sent')}
  });inp.value='';burst(innerWidth/2,innerHeight/2,'#a855f7')}

function appendP2PMsg(text,sender,dir){const box=document.getElementById('p2p-messages');const div=document.createElement('div');div.className='p2p-msg '+dir;div.textContent=`${dir==='sent'?'→':'←'} [${sender}] ${text}`;box.appendChild(div);box.scrollTop=box.scrollHeight}

function disconnectPeer(peer){if(peerConnections[peer]){peerConnections[peer].close();delete peerConnections[peer]}if(dataChannels[peer]){dataChannels[peer].close();delete dataChannels[peer]}updateActiveConnections();webrtcLog(`Disconnected from ${peer}`,'signal')}

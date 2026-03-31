/**
 * SmartChat X — Refactored Main Application Shell
 * Components, hooks, and services extracted into modular files
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { usePrivacy } from './hooks/usePrivacy';
import { supabase } from './lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, BarElement, ArcElement, Tooltip, Legend, Filler,
} from 'chart.js';

// Services & Context
import { API, WS_URL, ICE_SERVERS } from './services/api';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NetworkProvider, useNetwork } from './context/NetworkContext';
import { compressImage } from './lib/imageCompressor';
import { requestBackgroundSync } from './lib/serviceWorkerRegistration';

// Hooks
import { useOfflineQueue } from './hooks/useOfflineQueue';
import { useAdaptiveCall } from './hooks/useAdaptiveCall';

// Components
import CyberBg from './components/CyberBg';
import WelcomeScreen from './components/WelcomeScreen';
import AuthScreen, { ResetPasswordPage, EmailVerificationBanner } from './components/AuthScreen';
import NetworkBanner from './components/NetworkBanner';
import Sidebar from './components/Sidebar';
import AnalyticsPanel from './components/AnalyticsPanel';
import ChatBubble from './components/chat/ChatBubble';
import TypingIndicator from './components/chat/TypingIndicator';
import ImagePreview from './components/chat/ImagePreview';
import ProtocolToggle from './components/chat/ProtocolToggle';
import UserProfileModal from './components/UserProfileModal';
import CallHistoryPanel from './components/CallHistoryPanel';

// Existing modules
import { DMPanel, CallModal, AIChatPanel } from './DMPanel';
import { playMessageSound, playSentSound, playDMSound, startRingtone, stopRingtone, playCallConnected, playCallEnded, playErrorSound, showNotification, requestNotificationPermission } from './sounds';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Tooltip, Legend, Filler);

/* ═══════════════════════════════════════════════════════════
   CHAT DASHBOARD — Main orchestrator
   ═══════════════════════════════════════════════════════════ */
const ChatDashboard = () => {
  const { user, token, logout } = useAuth();
  const { mode: networkMode, isLow: isLowNetwork } = useNetwork();
  const { getAdaptiveConstraints, applyToSenders, qualityInfo } = useAdaptiveCall();
  const [messages, setMessages] = useState([]);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [input, setInput] = useState('');
  const [protocol, setProtocol] = useState('TCP');
  const [imageFile, setImageFile] = useState(null);
  const [typingUsers, setTypingUsers] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [connections, setConnections] = useState([]);
  const [blocks, setBlocks] = useState([]);
  const blocksRef = useRef([]);
  const [showSidebar, setShowSidebar] = useState(true);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [reconnectIn, setReconnectIn] = useState(0);
  const [networkStats, setNetworkStats] = useState({});
  const [networkInfoMap, setNetworkInfoMap] = useState({});
  // AI Features
  const [smartReplies, setSmartReplies] = useState([]);
  const [toxicityWarning, setToxicityWarning] = useState(null);
  const [studyMode, setStudyMode] = useState(false);
  const [studyResponse, setStudyResponse] = useState(null);
  const [chatSummary, setChatSummary] = useState(null);
  const [showSummary, setShowSummary] = useState(false);
  // WebRTC P2P
  const [p2pConnections, setP2pConnections] = useState({});
  const peerConnections = useRef({});
  const dataChannels = useRef({});
  // DM & Call & AI Chat
  const [dmTarget, setDmTarget] = useState(null);
  const [callState, setCallState] = useState(null);
  const [showAIChat, setShowAIChat] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showCallHistory, setShowCallHistory] = useState(false);
  const [profileData, setProfileData] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState({});

  // Privacy & Theme
  const { privacy, savePrivacy, isDND } = usePrivacy(user?.supabase_id || user?.id);
  const [theme, setTheme] = useState(() => localStorage.getItem('sx-theme') || 'dark');

  const handleThemeChange = (t) => {
    setTheme(t);
    localStorage.setItem('sx-theme', t);
    savePrivacy({ theme: t });
  };

  // Apply theme to <html>
  useEffect(() => {
    document.documentElement.className = theme;
  }, [theme]);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const callPCs = useRef({});
  const callStream = useRef(null);
  const pendingICE = useRef({});
  // Call timing for history
  const callStartTime = useRef(null);

  const ws = useRef(null);
  const chatEnd = useRef(null);
  const chatContainer = useRef(null);
  const fileInput = useRef(null);
  const typingTimer = useRef(null);
  const reconnectTimer = useRef(null);
  const reconnectAttempt = useRef(0);
  const maxReconnectAttempts = 10;

  // Phase 2: Offline queue + message cache
  const { send: queueSend, queueCount, cacheMessage, loadCachedMessages } = useOfflineQueue(ws.current);

  const cycleProtocol = () => setProtocol(p => p === 'TCP' ? 'UDP' : p === 'UDP' ? 'AUTO' : 'TCP');

  // Chat feature states
  const [reactions, setReactions] = useState({});
  const [replyingTo, setReplyingTo] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  const handleReact = (msgId, emoji) => {
    setReactions(prev => {
      const msgReactions = { ...(prev[msgId] || {}) };
      msgReactions[emoji] = (msgReactions[emoji] || 0) + 1;
      return { ...prev, [msgId]: msgReactions };
    });
  };

  const clearChat = () => {
    if (window.confirm('Clear all messages from your view? (Server messages remain)')) {
      setMessages([]);
      setReactions({});
    }
  };

  const filteredMessages = showSearch && searchQuery
    ? messages.filter(m => m.content?.toLowerCase().includes(searchQuery.toLowerCase()) || m.sender_username?.toLowerCase().includes(searchQuery.toLowerCase()))
    : messages;

  // ── Load messages + users on mount ──────────────────
  useEffect(() => {
    requestNotificationPermission();
    fetch(`${API}/api/messages?room=global&limit=50`)
      .then(r => r.json())
      .then(data => {
        setMessages(data.messages || data);
        setHasMoreMessages(data.has_more || false);
      })
      .catch(() => {});
    fetch(`${API}/api/users`)
      .then(r => r.json()).then(setAllUsers).catch(() => {});
  }, []);

  // ── Fetch and subscribe to connections & blocks ──────────────
  useEffect(() => {
    if (!user?.id) {
      setConnections([]);
      setBlocks([]);
      return;
    }

    const loadConnections = async () => {
      const { data } = await supabase.from('connections')
        .select('*')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);
      setConnections(data || []);
    };
    
    const loadBlocks = async () => {
      const { data } = await supabase.from('blocks')
        .select('*')
        .or(`blocker_id.eq.${user.id},blocked_id.eq.${user.id}`);
      setBlocks(data || []);
      blocksRef.current = data || [];
    };
    
    loadConnections();
    loadBlocks();

    const channel = supabase.channel('realtime:connections_blocks')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'connections' }, (payload) => {
        loadConnections();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'blocks' }, (payload) => {
        loadBlocks();
      })
      .subscribe();
      
    return () => supabase.removeChannel(channel);
  }, [user?.id]);

  // ── Supabase Realtime — cross-device message sync ────
  useEffect(() => {
    const channel = supabase
      .channel('global-messages')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `room=eq.global`,
      }, (payload) => {
        const newMsg = payload.new;
        setMessages(prev => {
          // Avoid duplicates (WS may have already added it)
          if (prev.some(m => m.id === newMsg.id)) return prev;
          return [...prev, { ...newMsg, type: 'new_message' }];
        });
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  // ── Infinite scroll — load older messages ────────────
  const loadMoreMessages = useCallback(async () => {
    if (loadingMore || !hasMoreMessages || messages.length === 0) return;
    const oldestId = messages[0]?.id;
    if (!oldestId) return;
    setLoadingMore(true);
    try {
      const res = await fetch(`${API}/api/messages?room=global&limit=50&before_id=${oldestId}`);
      const data = await res.json();
      const older = data.messages || [];
      setMessages(prev => {
        const existingIds = new Set(prev.map(m => m.id));
        const deduped = older.filter(m => !existingIds.has(m.id));
        return [...deduped, ...prev];
      });
      setHasMoreMessages(data.has_more || false);
    } catch {}
    setLoadingMore(false);
  }, [loadingMore, hasMoreMessages, messages]);

  const handleChatScroll = useCallback(() => {
    const el = chatContainer.current;
    if (!el || loadingMore || !hasMoreMessages) return;
    if (el.scrollTop < 100) loadMoreMessages();
  }, [loadingMore, hasMoreMessages, loadMoreMessages]);

  // ── WebSocket connection with reconnection logic ────
  const connectWebSocket = useCallback(() => {
    if (!token) return;
    const socket = new WebSocket(`${WS_URL}/ws/${token}`);

    socket.onopen = () => {
      setConnectionStatus('connected');
      reconnectAttempt.current = 0;
      console.log('[WS] ⚡ Connected to SmartChat X');
      const statsInterval = setInterval(() => {
        if (socket.readyState === 1) {
          socket.send(JSON.stringify({ type: 'get_network_stats' }));
        }
      }, 10000);
      socket._statsInterval = statsInterval;
    };

    socket.onmessage = async (e) => {
      try {
        const data = JSON.parse(e.data);
        switch (data.type) {
          case 'new_message':
            // Phase 2: Cache incoming messages for offline reading
            cacheMessage(data);
            setMessages(prev => [...prev, data]);
            if (data.sender_id !== user?.id) {
              playMessageSound();
              showNotification(`💬 ${data.sender_username}`, data.content?.slice(0, 80) || 'New message');
            }
            break;
          case 'message_sent':
            // Phase 2: Cache own sent messages too
            cacheMessage(data);
            setMessages(prev => [...prev, data]);
            playSentSound();
            if (data.smart_replies?.length) setSmartReplies(data.smart_replies);
            break;
          case 'message_delivered':
            setMessages(prev => prev.map(m => m.id === data.message_id ? { ...m, delivered: 1 } : m));
            break;
          case 'message_dropped':
            setMessages(prev => prev.map(m => m.id === data.message_id ? { ...m, dropped: 1 } : m));
            break;
          case 'network_processed':
            setNetworkInfoMap(prev => ({ ...prev, [data.message_id]: data.network_result }));
            break;
          case 'network_stats':
            setNetworkStats(data);
            break;
          case 'user_online':
          case 'user_offline':
            setOnlineUsers(data.online_users || []);
            fetch(`${API}/api/users`).then(r => r.json()).then(setAllUsers).catch(() => {});
            break;
          case 'user_typing':
            setTypingUsers(prev => [...new Set([...prev, data.username])]);
            break;
          case 'user_stop_typing':
            setTypingUsers(prev => prev.filter(u => u !== data.username));
            break;
          case 'toxicity_warning':
            setToxicityWarning(data);
            setTimeout(() => setToxicityWarning(null), 5000);
            break;
          case 'smart_replies':
            setSmartReplies(data.replies || []);
            break;
          case 'study_response':
            setStudyResponse(data);
            break;
          case 'summary_response':
            setChatSummary(data);
            setShowSummary(true);
            break;
          case 'translate_response':
            alert(`🌍 Translation (${data.language}):\n\n"${data.original}"\n→ "${data.translated}"`);
            break;
          // WebRTC P2P Signaling
          case 'webrtc_offer': handleWebRTCOffer(data); break;
          case 'webrtc_answer': handleWebRTCAnswer(data); break;
          case 'webrtc_ice': handleWebRTCICE(data); break;
          case 'webrtc_disconnect': handleWebRTCDisconnect(data); break;
          // Call Signaling
          case 'incoming_call': {
            const blks = blocksRef.current;
            const isBlocked = blks.some(b => 
              (b.blocker_id === user?.id && b.blocked_id === data.from_user_id) ||
              (b.blocked_id === user?.id && b.blocker_id === data.from_user_id)
            );
            if (isBlocked) {
              ws.current?.send(JSON.stringify({ type: 'call_rejected', target_user_id: data.from_user_id }));
              break;
            }

            if (callStateRef.current?.status === 'active') {
              // I am already in an active call! Just auto-accept this connection silently since it's a mesh join
              handleAutoMeshAccept(data);
              break;
            }

            startRingtone();
            showNotification(`📞 ${data.from_username}`, `${data.call_type === 'video' ? 'Video' : 'Voice'} call`);
            setCallState({ status: 'incoming', username: data.from_username, user_id: data.from_user_id, type: data.call_type || 'voice', offer: data.offer, mesh_users: data.mesh_users || [] });
            break;
          }
          case 'call_accepted':
            stopRingtone();
            if (callPCs.current[data.from_user_id] && data.answer) {
              await callPCs.current[data.from_user_id].setRemoteDescription(new RTCSessionDescription(data.answer));
              for (const candidate of pendingICE.current[data.from_user_id] || []) {
                await callPCs.current[data.from_user_id].addIceCandidate(new RTCIceCandidate(candidate)).catch(e => console.warn('[WebRTC] Queued ICE error:', e));
              }
              pendingICE.current[data.from_user_id] = [];
            }
            playCallConnected();
            setCallState(prev => prev ? { ...prev, status: 'active' } : null);
            break;
          case 'call_rejected':
            stopRingtone(); playCallEnded();
            if (callPCs.current[data.from_user_id]) {
               callPCs.current[data.from_user_id].close();
               delete callPCs.current[data.from_user_id];
               setRemoteStreams(prev => { const n={...prev}; delete n[data.from_user_id]; return n;});
            }
            if (Object.keys(callPCs.current).length === 0) cleanupCall();
            break;
          case 'call_ended':
            stopRingtone(); playCallEnded();
            if (callPCs.current[data.from_user_id]) {
               callPCs.current[data.from_user_id].close();
               delete callPCs.current[data.from_user_id];
               setRemoteStreams(prev => { const n={...prev}; delete n[data.from_user_id]; return n;});
            }
            if (Object.keys(callPCs.current).length === 0) cleanupCall();
            break;
          case 'call_ice':
            if (data.candidate) {
              const pc = callPCs.current[data.from_user_id];
              if (pc && pc.remoteDescription) {
                pc.addIceCandidate(new RTCIceCandidate(data.candidate)).catch(e => console.warn('[WebRTC] ICE error:', e));
              } else {
                pendingICE.current[data.from_user_id] = pendingICE.current[data.from_user_id] || [];
                pendingICE.current[data.from_user_id].push(data.candidate);
              }
            }
            break;
          case 'private_message': {
            const blks = blocksRef.current;
            const isBlocked = blks.some(b => 
              (b.blocker_id === user?.id && b.blocked_id === data.sender_id) ||
              (b.blocked_id === user?.id && b.blocker_id === data.sender_id)
            );
            if (isBlocked) break;
            
            playDMSound();
            if (data.sender_username) showNotification(`💬 DM from ${data.sender_username}`, data.content?.slice(0, 80) || 'Private message');
            break;
          }
          case 'dm_sent': case 'dm_history': case 'ai_chat_response': break;
        }
      } catch {}
    };

    socket.onclose = () => {
      setConnectionStatus('disconnected');
      clearInterval(socket._statsInterval);
      // Phase 4: Request background sync so SW flushes queue when online
      requestBackgroundSync();
      // Phase 2: Load cached messages for offline reading
      loadCachedMessages().then(cached => {
        if (cached.length > 0) {
          setMessages(prev => {
            const ids = new Set(prev.map(m => m.id));
            const fresh = cached.filter(m => !ids.has(m.id));
            return fresh.length ? prev : prev; // already in state
          });
        }
      });
      if (reconnectAttempt.current < maxReconnectAttempts) {
        const delay = Math.min(2 ** reconnectAttempt.current * 1000, 30000);
        const delaySec = Math.ceil(delay / 1000);
        setConnectionStatus('reconnecting');
        setReconnectIn(delaySec);
        let countdown = delaySec;
        const countdownInterval = setInterval(() => { countdown--; setReconnectIn(countdown); if (countdown <= 0) clearInterval(countdownInterval); }, 1000);
        reconnectTimer.current = setTimeout(() => { reconnectAttempt.current++; connectWebSocket(); }, delay);
      }
    };

    socket.onerror = () => console.log('[WS] ❌ Connection error');
    ws.current = socket;
  }, [token]);

  useEffect(() => {
    connectWebSocket();
    return () => {
      clearTimeout(reconnectTimer.current);
      ws.current?.close();
      Object.values(peerConnections.current).forEach(pc => pc.close());
    };
  }, [connectWebSocket]);

  // ── WebRTC P2P Handlers ─────────────────────────────
  const createPeerConnection = (targetUserId) => {
    const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
    pc.onicecandidate = (e) => {
      if (e.candidate && ws.current?.readyState === 1) ws.current.send(JSON.stringify({ type: 'webrtc_ice', target_user_id: targetUserId, candidate: e.candidate }));
    };
    pc.onconnectionstatechange = () => setP2pConnections(prev => ({ ...prev, [targetUserId]: pc.connectionState }));
    peerConnections.current[targetUserId] = pc;
    return pc;
  };

  const connectP2P = async (targetUserId) => {
    const pc = createPeerConnection(targetUserId);
    const dc = pc.createDataChannel('chat');
    dc.onmessage = (e) => { try { const msg = JSON.parse(e.data); setMessages(prev => [...prev, { ...msg, protocol: 'WebRTC', type: 'new_message' }]); } catch {} };
    dc.onopen = () => setP2pConnections(prev => ({ ...prev, [targetUserId]: 'connected' }));
    dataChannels.current[targetUserId] = dc;
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    ws.current?.send(JSON.stringify({ type: 'webrtc_offer', target_user_id: targetUserId, offer }));
  };

  const handleWebRTCOffer = async (data) => {
    const pc = createPeerConnection(data.from_user_id);
    pc.ondatachannel = (e) => {
      const dc = e.channel;
      dc.onmessage = (ev) => { try { const msg = JSON.parse(ev.data); setMessages(prev => [...prev, { ...msg, protocol: 'WebRTC', type: 'new_message' }]); } catch {} };
      dc.onopen = () => setP2pConnections(prev => ({ ...prev, [data.from_user_id]: 'connected' }));
      dataChannels.current[data.from_user_id] = dc;
    };
    await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    ws.current?.send(JSON.stringify({ type: 'webrtc_answer', target_user_id: data.from_user_id, answer }));
  };

  const handleWebRTCAnswer = async (data) => {
    const pc = peerConnections.current[data.from_user_id];
    if (pc) await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
  };

  const handleWebRTCICE = async (data) => {
    const pc = peerConnections.current[data.from_user_id];
    if (pc && data.candidate) await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
  };

  const handleWebRTCDisconnect = (data) => {
    const pc = peerConnections.current[data.from_user_id];
    if (pc) { pc.close(); delete peerConnections.current[data.from_user_id]; }
    delete dataChannels.current[data.from_user_id];
    setP2pConnections(prev => { const n = {...prev}; delete n[data.from_user_id]; return n; });
  };

  // ── Call Management ─────────────────────────────────
  // We need to access up-to-date callState from WS handlers
  const callStateRef = useRef(null);
  useEffect(() => { callStateRef.current = callState; }, [callState]);

  const getMediaStream = async (callType) => {
    if (callStream.current) return callStream.current;
    // Phase 3: Use adaptive constraints based on network mode
    const constraints = getAdaptiveConstraints(callType);
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    callStream.current = stream;
    setLocalStream(stream);
    return stream;
  };

  const setupCallPC = (stream, targetUserId) => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    callPCs.current[targetUserId] = pc;
    pendingICE.current[targetUserId] = pendingICE.current[targetUserId] || [];
    stream.getTracks().forEach(track => pc.addTrack(track, stream));

    pc.ontrack = (event) => {
      setRemoteStreams(prev => {
        const n = { ...prev };
        n[targetUserId] = event.streams && event.streams[0] ? event.streams[0] : new MediaStream([event.track]);
        return n;
      });
    };

    pc.onicecandidate = (e) => {
      if (e.candidate && ws.current?.readyState === 1) ws.current.send(JSON.stringify({ type: 'call_ice', target_user_id: targetUserId, candidate: e.candidate }));
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') { playCallConnected(); setCallState(prev => prev ? { ...prev, status: 'active' } : null); }
      else if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        pc.close();
        delete callPCs.current[targetUserId];
        setRemoteStreams(prev => {
          const n = { ...prev };
          delete n[targetUserId];
          return n;
        });
        if (Object.keys(callPCs.current).length === 0) cleanupCall();
      }
    };
    return pc;
  };

  const handleAutoMeshAccept = async (data) => {
    try {
      const stream = await getMediaStream(callStateRef.current.type);
      pendingICE.current[data.from_user_id] = [];
      const pc = setupCallPC(stream, data.from_user_id);
      await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
      for (const candidate of pendingICE.current[data.from_user_id] || []) await pc.addIceCandidate(new RTCIceCandidate(candidate));
      pendingICE.current[data.from_user_id] = [];
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      ws.current?.send(JSON.stringify({ type: 'call_answer', target_user_id: data.from_user_id, answer }));
      
      // I am a new node injected, continue meshing? Usually we just connect to whoever sent us the offer.
    } catch (err) { console.error(err); }
  };

  // ── Log call to Supabase ────────────────────────────
  const logCallHistory = useCallback(async ({ callerId, calleeId, callerName, calleeName, callType, direction, status, startedAt, endedAt }) => {
    try {
      const durationS = (startedAt && endedAt) ? Math.round((new Date(endedAt) - new Date(startedAt)) / 1000) : 0;
      await supabase.from('call_history').insert({
        caller_id: callerId, callee_id: calleeId,
        caller_name: callerName, callee_name: calleeName,
        call_type: callType, direction, status,
        started_at: startedAt || new Date().toISOString(),
        ended_at: endedAt || new Date().toISOString(),
        duration_s: durationS,
      });
    } catch (e) { console.warn('Call history log failed:', e.message); }
  }, []);

  const initiateCall = async (targetUserId, targetUsername, callType = 'voice') => {
    try {
      const stream = await getMediaStream(callType);
      pendingICE.current = {};
      const pc = setupCallPC(stream, targetUserId);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      ws.current?.send(JSON.stringify({ type: 'call_offer', target_user_id: targetUserId, call_type: callType, offer, mesh_users: [] }));
      callStartTime.current = new Date().toISOString();
      setCallState({ status: 'ringing', username: targetUsername, user_id: targetUserId, type: callType, initiatorId: targetUserId });
    } catch (err) {
      playErrorSound();
      alert(window.isSecureContext
        ? `❌ Call failed: ${err.message}\n\nPlease allow microphone${callType === 'video' ? '/camera' : ''} access.`
        : `❌ Microphone blocked!`
      );
    }
  };

  const inviteParticipant = async (userId) => {
    if (!callState || callState.status !== 'active') return;
    try {
      const stream = await getMediaStream(callState.type);
      const pc = setupCallPC(stream, userId);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      // Let the new user know who is already in the call
      const existingUsers = Object.keys(callPCs.current).filter(id => id !== userId);
      ws.current?.send(JSON.stringify({ type: 'group_call_offer', target_user_id: userId, call_type: callState.type, offer, mesh_users: existingUsers }));
    } catch (err) {
      console.error(err);
    }
  };

  const acceptCall = async () => {
    if (!callState?.offer) return;
    stopRingtone();
    try {
      const stream = await getMediaStream(callState.type);
      pendingICE.current = {};
      const pc = setupCallPC(stream, callState.user_id);
      await pc.setRemoteDescription(new RTCSessionDescription(callState.offer));
      for (const candidate of pendingICE.current[callState.user_id] || []) await pc.addIceCandidate(new RTCIceCandidate(candidate));
      pendingICE.current[callState.user_id] = [];
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      ws.current?.send(JSON.stringify({ type: 'call_answer', target_user_id: callState.user_id, answer }));
      
      // Auto-connect to existing mesh users immediately
      if (callState.mesh_users && callState.mesh_users.length > 0) {
         callState.mesh_users.forEach(async (meshUserId) => {
             const mPC = setupCallPC(stream, meshUserId);
             const mOffer = await mPC.createOffer();
             await mPC.setLocalDescription(mOffer);
             ws.current?.send(JSON.stringify({ type: 'group_call_offer', target_user_id: meshUserId, call_type: callState.type, offer: mOffer }));
         });
      }
      callStartTime.current = new Date().toISOString();
      playCallConnected();
      setCallState(prev => prev ? { ...prev, status: 'active' } : null);
    } catch (err) {
      playErrorSound();
      alert(window.isSecureContext ? `❌ Call failed: ${err.message}` : `❌ Microphone blocked!`);
      cleanupCall();
    }
  };

  const cleanupCall = () => {
    stopRingtone();
    if (callStream.current) { callStream.current.getTracks().forEach(t => t.stop()); callStream.current = null; }
    Object.values(callPCs.current).forEach(pc => pc.close());
    callPCs.current = {};
    pendingICE.current = {};
    setCallState(null); setLocalStream(null); setRemoteStreams({}); setIsScreenSharing(false);
  };

  const endCall = () => {
    Object.keys(callPCs.current).forEach(id => {
      if (ws.current?.readyState === 1) ws.current.send(JSON.stringify({ type: 'call_end', target_user_id: id }));
    });
    if (callState?.user_id && ws.current?.readyState === 1) ws.current.send(JSON.stringify({ type: 'call_end', target_user_id: callState.user_id }));
    // Log to call history
    if (callState && user?.supabase_id) {
      const isInitiator = callState.initiatorId === callState.user_id;
      logCallHistory({
        callerId: isInitiator ? user.supabase_id : callState.user_id,
        calleeId: isInitiator ? callState.user_id : user.supabase_id,
        callerName: isInitiator ? user.username : callState.username,
        calleeName: isInitiator ? callState.username : user.username,
        callType: callState.type,
        direction: isInitiator ? 'outgoing' : 'incoming',
        status: callState.status === 'active' ? 'completed' : 'missed',
        startedAt: callStartTime.current,
        endedAt: new Date().toISOString(),
      });
    }
    playCallEnded(); cleanupCall();
  };

  const rejectCall = () => {
    stopRingtone();
    if (callState?.user_id && ws.current?.readyState === 1) ws.current.send(JSON.stringify({ type: 'call_reject', target_user_id: callState.user_id }));
    // Log missed/rejected call
    if (callState && user?.supabase_id) {
      logCallHistory({
        callerId: callState.user_id,
        calleeId: user.supabase_id,
        callerName: callState.username,
        calleeName: user.username,
        callType: callState.type,
        direction: 'incoming',
        status: 'missed',
        startedAt: callStartTime.current || new Date().toISOString(),
        endedAt: new Date().toISOString(),
      });
    }
    playCallEnded(); cleanupCall();
  };

  // ── Screen Share ────────────────────────────────────
  const toggleScreenShare = async () => {
    if (Object.keys(callPCs.current).length === 0 || !callState) return;
    try {
      if (isScreenSharing) {
        const constraints = callState.type === 'video' ? { audio: true, video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' } } : { audio: true };
        const camStream = await navigator.mediaDevices.getUserMedia(constraints);
        const videoTrack = camStream.getVideoTracks()[0];
        
        if (videoTrack) {
          Object.values(callPCs.current).forEach(async pc => {
            const sender = pc.getSenders().find(s => s.track?.kind === 'video');
            if (sender) await sender.replaceTrack(videoTrack).catch(e => console.warn(e));
          });
          callStream.current?.getVideoTracks().forEach(t => t.stop());
          const newStream = new MediaStream([...callStream.current.getAudioTracks(), videoTrack]);
          callStream.current = newStream; setLocalStream(newStream);
        }
        Object.values(callPCs.current).forEach(pc => {
            const screenAudioSender = pc.getSenders().find(s => s.track?.kind === 'audio' && (s.track?.label?.includes('screen') || s.track?.label?.includes('System')));
            if (screenAudioSender) pc.removeTrack(screenAudioSender);
        });
        setIsScreenSharing(false);
      } else {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: { width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 30 } }, audio: true });
        const screenTrack = screenStream.getVideoTracks()[0];
        let needsRenegotiation = false;
        
        if (screenTrack) {
          Object.values(callPCs.current).forEach(async pc => {
              const sender = pc.getSenders().find(s => s.track?.kind === 'video');
              if (sender) { await sender.replaceTrack(screenTrack).catch(e=>console.warn(e)); } 
              else { pc.addTrack(screenTrack, screenStream); needsRenegotiation = true; }
          });
          callStream.current?.getVideoTracks().forEach(t => t.stop());
          const newStream = new MediaStream([...callStream.current.getAudioTracks(), screenTrack]);
          callStream.current = newStream; setLocalStream(newStream);
          screenTrack.onended = () => toggleScreenShare();
        }
        
        const screenAudioTrack = screenStream.getAudioTracks()[0];
        if (screenAudioTrack) {
          Object.values(callPCs.current).forEach(async pc => {
              const existingAudioSender = pc.getSenders().find(s => s.track?.kind === 'audio');
              if (existingAudioSender) { await existingAudioSender.replaceTrack(screenAudioTrack).catch(e=>console.warn(e)); } 
              else { pc.addTrack(screenAudioTrack, screenStream); needsRenegotiation = true; }
          });
        }
        
        if (needsRenegotiation && ws.current?.readyState === 1) {
            Object.entries(callPCs.current).forEach(async ([userId, pc]) => {
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);
                ws.current.send(JSON.stringify({ type: 'call_offer', target_user_id: userId, offer: pc.localDescription, renegotiate: true }));
            });
        }
        setIsScreenSharing(true);
      }
    } catch (err) {
      if (err.name !== 'NotAllowedError') alert(`Screen share failed: ${err.message}`);
    }
  };

  // ── Auto scroll (only when near bottom) ────────────
  useEffect(() => {
    const el = chatContainer.current;
    if (!el) return;
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 200;
    if (isNearBottom || loadingMore) {
      chatEnd.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, typingUsers]);

  // ── Send message ────────────────────────────────────
  const sendMessage = async () => {
    if (!input.trim() && !imageFile) return;
    const trimmed = input.trim();
    const isWsOpen = ws.current?.readyState === 1;

    // Commands only work with live connection
    if (isWsOpen) {
      if (trimmed.startsWith('/study ') || trimmed.startsWith('/quiz')) {
        ws.current.send(JSON.stringify({ type: 'study_query', query: trimmed.startsWith('/study ') ? trimmed.slice(7) : trimmed }));
        setStudyMode(true); setInput(''); return;
      }
      if (trimmed === '/summarize') { ws.current.send(JSON.stringify({ type: 'summarize', room: 'global', limit: 50 })); setInput(''); return; }
      if (trimmed.startsWith('/ai ')) { ws.current.send(JSON.stringify({ type: 'ai_chat', content: trimmed.slice(4) })); setShowAIChat(true); setInput(''); return; }
      if (trimmed.startsWith('/translate ')) {
        const parts = trimmed.slice(11).split(' to ');
        if (parts.length === 2) ws.current.send(JSON.stringify({ type: 'translate', text: parts[0].trim(), language: parts[1].trim() }));
        setInput(''); return;
      }
      if (trimmed === '/clear') { clearChat(); setInput(''); return; }
    }

    // Block image upload in strict low-network mode
    if (isLowNetwork && imageFile) {
      alert('📡 Image upload disabled in Low Data Mode. Send text only.');
      setImageFile(null);
      return;
    }

    let imageUrl = null;
    if (imageFile) {
      // Compress before upload based on network mode
      const compressed = await compressImage(imageFile, networkMode);
      const form = new FormData(); form.append('file', compressed);
      try { const res = await fetch(`${API}/api/upload`, { method: 'POST', body: form }); const data = await res.json(); imageUrl = data.url; } catch {}
    }

    const msgPayload = { type: 'message', content: trimmed, image_url: imageUrl, protocol, room: 'global' };
    if (replyingTo) msgPayload.reply_to = { id: replyingTo.id, sender_username: replyingTo.sender_username, content: replyingTo.content?.slice(0, 100) };

    // Phase 2: Use offline queue — will queue if offline and auto-send on reconnect
    const { sent, queued } = await queueSend(msgPayload);

    if (queued) {
      // Optimistic local message with 'queued' badge
      const optimistic = {
        ...msgPayload,
        id: `opt-${Date.now()}`,
        sender_id: user?.id,
        sender_username: user?.username,
        created_at: new Date().toISOString(),
        _queued: true,
      };
      setMessages(prev => [...prev, optimistic]);
    }

    if (sent) {
      ws.current?.send(JSON.stringify({ type: 'stop_typing' }));
    }

    setInput(''); setImageFile(null); setSmartReplies([]); setReplyingTo(null);
  };

  const handleInputChange = (e) => {
    setInput(e.target.value);
    if (ws.current?.readyState === 1) {
      ws.current.send(JSON.stringify({ type: 'typing' }));
      clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(() => ws.current?.send(JSON.stringify({ type: 'stop_typing' })), 2000);
    }
  };

  const isConnected = connectionStatus === 'connected';

  return (
    <div className="h-screen flex relative overflow-hidden" style={{ background: 'var(--bg-base)' }}>
      {/* Skip heavy animated background in low network mode */}
      {!isLowNetwork && <CyberBg />}
      <div className="fixed inset-0 bg-cyber-grid pointer-events-none z-0" />

      <Sidebar users={allUsers} connections={connections} blocks={blocks} onlineIds={onlineUsers} currentUser={user} show={showSidebar}
        onClose={() => setShowSidebar(false)} onConnectP2P={connectP2P} p2pConnections={p2pConnections}
        onDMClick={setDmTarget} onCall={initiateCall} isDND={isDND} onThemeChange={handleThemeChange} />

      <div className="flex-1 flex flex-col relative z-10 min-w-0">
        <NetworkBanner connectionStatus={connectionStatus} reconnectIn={reconnectIn} />

        {/* Header */}
        <header className="border-b px-4 py-3 flex items-center justify-between"
          style={{ background: 'var(--bg-raised)', borderColor: 'var(--border)', backdropFilter: 'blur(20px)' }}>
          <div className="flex items-center gap-3">
            <button onClick={() => setShowSidebar(!showSidebar)} className="lg:hidden text-sm mr-1 transition-colors" style={{ color: 'var(--text-3)' }}>☰</button>
            <div className="w-7 h-7 rounded-xl flex items-center justify-center text-sm" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>⚡</div>
            <div>
              <h1 className="text-sm font-bold tracking-tight" style={{ color: 'var(--text-1)' }}>SmartChat <span className="text-gradient">X</span></h1>
              <p className="text-[9px] font-mono uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>
                Global Channel • {onlineUsers.length} Online • TCP:{9000} UDP:{9001}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ProtocolToggle protocol={protocol} onToggle={cycleProtocol} />
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={() => { setStudyMode(!studyMode); setStudyResponse(null); }}
              className={`text-lg transition-colors ${studyMode ? 'text-neon-green' : 'text-white/25 hover:text-neon-green'}`}
              title="Study Mode">📚</motion.button>
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={() => ws.current?.send(JSON.stringify({ type: 'summarize', room: 'global', limit: 50 }))}
              className="text-white/25 hover:text-neon-cyan text-lg transition-colors" title="Summarize Chat">📝</motion.button>
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={() => setShowAIChat(!showAIChat)}
              className={`text-lg transition-colors ${showAIChat ? 'text-purple-400' : 'text-white/25 hover:text-purple-400'}`}
              title="AI Chat">🤖</motion.button>
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={() => { setShowSearch(!showSearch); setSearchQuery(''); }}
              className={`text-lg transition-colors ${showSearch ? 'text-neon-cyan' : 'text-white/25 hover:text-neon-cyan'}`}
              title="Search">🔍</motion.button>
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={clearChat} className="text-white/25 hover:text-neon-pink text-lg transition-colors" title="Clear Chat">🗑️</motion.button>
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={() => setShowAnalytics(!showAnalytics)}
              className="text-white/25 hover:text-neon-cyan text-lg transition-colors" title="Network Analytics">📊</motion.button>
            {Object.values(p2pConnections).some(s => s === 'connected') && <span className="p2p-indicator">🟢 P2P Active</span>}
            <div className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-neon-green animate-pulse' : connectionStatus === 'reconnecting' ? 'bg-yellow-500 animate-pulse' : 'bg-red-500'}`}
                style={{ boxShadow: isConnected ? '0 0 8px rgba(0,255,136,0.5)' : 'none' }} />
              <span className="text-[9px] font-mono text-white/20 hidden sm:inline">
                {isConnected ? 'LIVE' : connectionStatus === 'reconnecting' ? 'RECONNECTING' : 'OFFLINE'}
              </span>
            </div>
            {/* Call History & Profile */}
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={() => setShowCallHistory(true)}
              className="text-white/25 hover:text-neon-green text-lg transition-colors" title="Call History">📋</motion.button>
            <div className="flex items-center gap-2 pl-2 border-l border-white/[0.06]">
              <motion.button
                whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.95 }}
                onClick={() => setShowProfile(true)}
                className="relative flex items-center gap-2 group cursor-pointer"
                title="My Profile"
              >
                {profileData?.avatar_url || user?.avatar_url ? (
                  <img src={profileData?.avatar_url || user?.avatar_url} alt="avatar"
                    className="w-7 h-7 rounded-full object-cover border border-neon-cyan/30" />
                ) : (
                  <span className="text-lg">{user?.avatar || '👤'}</span>
                )}
                <span className="text-[10px] font-mono text-white/30 hidden sm:inline group-hover:text-white/60 transition-colors">
                  {profileData?.display_name || user?.username}
                </span>
              </motion.button>
              <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                onClick={logout} className="text-white/15 hover:text-neon-pink text-xs transition-colors ml-1" title="Logout">⏻</motion.button>
            </div>
          </div>
        </header>

        {/* Search Bar */}
        <AnimatePresence>
          {showSearch && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              className="px-4 py-2 border-b border-white/[0.04]" style={{ background: 'rgba(0,240,255,0.02)' }}>
              <div className="flex items-center gap-2">
                <span className="text-white/20 text-sm">🔍</span>
                <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search messages or users..." autoFocus
                  className="flex-1 bg-transparent text-xs text-white/60 font-poppins outline-none placeholder-white/20" />
                {searchQuery && <span className="text-[9px] font-mono text-neon-cyan">{filteredMessages.length} result{filteredMessages.length !== 1 ? 's' : ''}</span>}
                <button onClick={() => { setShowSearch(false); setSearchQuery(''); }} className="text-white/20 hover:text-white/50 text-xs">✕</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Messages */}
        <div
          ref={chatContainer}
          onScroll={handleChatScroll}
          className="flex-1 overflow-y-auto px-4 py-4"
          style={{ scrollBehavior: 'smooth', background: 'var(--bg-base)' }}
        >
          {/* Infinite scroll: load more indicator at top */}
          {loadingMore && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ repeat: Infinity, duration: 1 }}
              className="text-center py-2 mb-2"
            >
              <span className="text-[9px] font-mono text-neon-cyan/40">⟳ Loading older messages...</span>
            </motion.div>
          )}
          {!hasMoreMessages && messages.length > 0 && (
            <div className="text-center mb-4">
              <span className="inline-block px-3 py-1 rounded-lg text-[8px] font-mono text-white/10"
                style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)' }}>
                🔒 Beginning of global channel
              </span>
            </div>
          )}
          {messages.length === 0 && !loadingMore && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center mb-6">
              <span className="inline-block px-4 py-1.5 rounded-xl text-[9px] font-mono text-white/20"
                style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
                🔒 AI-Powered • TCP/UDP/WebRTC • Smart Routing • /study /quiz /summarize
              </span>
            </motion.div>
          )}

          <AnimatePresence>
            {filteredMessages.map((msg, idx) => (
              <ChatBubble key={msg.id || idx} msg={msg} isOwn={msg.sender_id === user?.id}
                networkInfo={networkInfoMap[msg.id]} reactions={reactions} onReact={handleReact} onReply={setReplyingTo} />
            ))}
          </AnimatePresence>

          {/* Study Response */}
          <AnimatePresence>
            {studyMode && studyResponse && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="study-panel mx-4 mb-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-orbitron text-neon-green tracking-wider">🧠 STUDY MODE</span>
                  <button onClick={() => { setStudyMode(false); setStudyResponse(null); }} className="text-white/20 hover:text-white/50 text-sm">✕</button>
                </div>
                <p className="text-xs text-white/70 leading-relaxed whitespace-pre-wrap">{studyResponse.response}</p>
                {studyResponse.tip && <p className="text-[10px] text-white/30 mt-2 italic">{studyResponse.tip}</p>}
                {studyResponse.related_topics?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {studyResponse.related_topics.map(t => (
                      <span key={t} className="smart-reply-chip text-[9px]" style={{ color: '#00ff88', borderColor: 'rgba(0,255,136,0.2)' }}
                        onClick={() => setInput(`/study ${t}`)}>{t}</span>
                    ))}
                  </div>
                )}
                {studyResponse.type === 'quiz' && studyResponse.answer && (
                  <details className="mt-2">
                    <summary className="text-[10px] font-mono text-neon-cyan cursor-pointer">Show Answer</summary>
                    <p className="text-xs text-white/60 mt-1">{studyResponse.answer}</p>
                  </details>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Chat Summary */}
          <AnimatePresence>
            {showSummary && chatSummary && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="glass-card mx-4 mb-3 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-orbitron text-neon-cyan tracking-wider">📝 CHAT SUMMARY</span>
                  <button onClick={() => setShowSummary(false)} className="text-white/20 hover:text-white/50 text-sm">✕</button>
                </div>
                <p className="text-xs text-white/60 whitespace-pre-wrap leading-relaxed">{chatSummary.summary}</p>
                {chatSummary.key_topics?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {chatSummary.key_topics.map(t => <span key={t} className="badge-tcp text-[8px]">{t}</span>)}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Toxicity Warning */}
          <AnimatePresence>
            {toxicityWarning && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="toxicity-warn mx-4 mb-2">
                ⚠️ {toxicityWarning.message} (severity: {toxicityWarning.severity}, score: {toxicityWarning.score})
              </motion.div>
            )}
          </AnimatePresence>

          <TypingIndicator users={typingUsers.filter(u => u !== user?.username)} />
          <div ref={chatEnd} />
        </div>

        {/* Smart Reply Chips */}
        <AnimatePresence>
          {smartReplies.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 5 }}
              className="px-4 py-2 flex gap-2 overflow-x-auto border-t" style={{ background: 'var(--bg-raised)', borderColor: 'var(--border)' }}>
              <span className="text-[9px] font-mono text-white/20 self-center whitespace-nowrap">💡 Quick:</span>
              {smartReplies.map((reply, i) => (
                <motion.button key={i} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="smart-reply-chip"
                  onClick={() => { setInput(reply); setSmartReplies([]); }}>{reply}</motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {imageFile && <ImagePreview file={imageFile} onRemove={() => setImageFile(null)} />}

        {/* Reply Indicator */}
        <AnimatePresence>
          {replyingTo && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              className="px-4 py-2 border-t border-white/[0.04]" style={{ background: 'rgba(0,240,255,0.02)' }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-neon-cyan text-sm">↩</span>
                  <div className="min-w-0">
                    <p className="text-[10px] font-mono text-neon-cyan/70">Replying to <b>{replyingTo.sender_username}</b></p>
                    <p className="text-[10px] text-white/25 truncate">{replyingTo.content?.slice(0, 80)}</p>
                  </div>
                </div>
                <button onClick={() => setReplyingTo(null)} className="text-white/20 hover:text-white/50 text-xs ml-2">✕</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input Bar */}
        <div className="border-t px-4 py-3 flex items-center gap-3"
          style={{ background: 'var(--bg-raised)', borderColor: 'var(--border)', backdropFilter: 'blur(20px)' }}>
          <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
            onClick={() => fileInput.current?.click()} className="text-white/20 hover:text-neon-cyan text-lg transition-colors" title="Upload Image">📎</motion.button>
          <input type="file" ref={fileInput} onChange={e => setImageFile(e.target.files[0])} accept="image/*" className="hidden" />
          <input value={input} onChange={handleInputChange}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendMessage())}
            placeholder={protocol === 'AUTO' ? 'AI picks best protocol...' : `Message via ${protocol}${protocol === 'TCP' ? ' (reliable)' : ' (fast, may drop)'}...`}
            className="neon-input flex-1" />
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.9 }} onClick={sendMessage}
            className="btn-neon px-5 py-2.5 relative" disabled={!isConnected && queueCount === 0}
            style={{ opacity: 1 }}
            title={!isConnected ? `${queueCount} message${queueCount !== 1 ? 's' : ''} queued — will send on reconnect` : 'Send'}
          >
            {!isConnected && queueCount > 0
              ? <span>📤 Queued ({queueCount})</span>
              : <span>⚡ Send</span>
            }
          </motion.button>
        </div>
      </div>

      <AnalyticsPanel show={showAnalytics} messages={messages} networkStats={networkStats} onClose={() => setShowAnalytics(false)} />

      <AnimatePresence>
        {dmTarget && <DMPanel targetUser={dmTarget} currentUser={user} connections={connections} blocks={blocks} ws={ws.current} onClose={() => setDmTarget(null)} />}
      </AnimatePresence>
      <AnimatePresence>
        {showAIChat && <AIChatPanel ws={ws.current} onClose={() => setShowAIChat(false)} />}
      </AnimatePresence>
      {/* User Profile Modal */}
      <AnimatePresence>
        {showProfile && (
          <UserProfileModal
            currentUser={{ ...user, ...(profileData || {}) }}
            onClose={() => setShowProfile(false)}
            onProfileUpdate={(updated) => setProfileData(updated)}
          />
        )}
      </AnimatePresence>
      {/* Call History Panel */}
      <AnimatePresence>
        {showCallHistory && (
          <CallHistoryPanel
            currentUser={user}
            onClose={() => setShowCallHistory(false)}
            onCall={(userId, username, callType) => { setShowCallHistory(false); initiateCall(userId, username, callType); }}
          />
        )}
      </AnimatePresence>
      {callState && (
        <CallModal callState={callState} localStream={localStream} remoteStream={Object.values(remoteStreams)[0] || null}
          onAccept={acceptCall} onReject={rejectCall} onEnd={endCall}
          onToggleScreenShare={toggleScreenShare} isScreenSharing={isScreenSharing} />
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   APP — Main entry point
   ═══════════════════════════════════════════════════════════ */
// Auth callback + reset password — now co-located in AuthScreen.jsx

export default function App() {
  const [showWelcome, setShowWelcome] = useState(true);
  return (
    <NetworkProvider>
      <AuthProvider>
        <AnimatePresence mode="wait">
          {showWelcome ? (
            <WelcomeScreen key="welcome" onStart={() => setShowWelcome(false)} />
          ) : (
            <AppContent key="app" />
          )}
        </AnimatePresence>
      </AuthProvider>
    </NetworkProvider>
  );
}

function AppContent() {
  const { isLoggedIn, loading, user, session, isEmailVerified } = useAuth();
  const [resetMode, setResetMode] = useState(false);

  // Detect password-reset / email-confirm callback in URL
  useEffect(() => {
    const hash   = window.location.hash;
    const search = window.location.search;
    // PKCE: Supabase v2 puts type=recovery in the hash after redirect
    const hashParams   = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash);
    const searchParams = new URLSearchParams(search);
    const type = hashParams.get('type') || searchParams.get('type');
    if (type === 'recovery' || window.location.pathname.includes('/auth/reset-password')) {
      setResetMode(true);
    }
  }, []);

  // ── Loading splash while restoring session ─────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-base)' }}>
        <motion.div animate={{ rotate: 360, scale: [1,1.2,1] }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="text-4xl">⚡</motion.div>
      </div>
    );
  }

  if (resetMode) {
    return <ResetPasswordPage onDone={() => { setResetMode(false); window.history.replaceState(null, '', '/'); }} />;
  }

  return (
    <AnimatePresence mode="wait">
      {isLoggedIn ? (
        isEmailVerified ? (
          // ✅ Fully authenticated + verified → show app
          <motion.div key="chat" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <ChatDashboard />
          </motion.div>
        ) : (
          // ✉️ Logged in but email not yet confirmed → show verification gate
          <motion.div key="verify" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <EmailVerificationBanner email={user?.email || session?.user?.email || ''} />
          </motion.div>
        )
      ) : (
        // 🔐 Not logged in → show auth screen
        <motion.div key="auth" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <AuthScreen />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

import React from 'react';
import { motion } from 'framer-motion';
import { VoicePlayer } from './VoiceRecorder';
import { FileMessage } from './FileShare';

const QUICK_EMOJIS = ['👍','❤️','😂','😮','😢','🔥','🎉','👏'];

const MessageBubble = React.memo(({
  msg,
  currentUser,
  reactMsg,
  deleteMsg,
  retryMessage,
  setReplyTo,
  setLightboxUrl
}) => {
  const isOwn = msg.sender_id === currentUser?.id;
  const ctype = msg.content_type;
  const isDeleted = msg.deleted === 1 || msg.deleted === true;
  const isFailed = msg.status === 'failed';
  
  const reactions = msg.reactions
    ? (typeof msg.reactions === 'string' ? JSON.parse(msg.reactions) : msg.reactions)
    : {};
  const hasReactions = Object.keys(reactions).length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: isFailed ? 0.7 : 1, y: 0 }}
      className={`flex ${isOwn ? 'justify-end' : 'justify-start'} group`}
      style={{ marginBottom: hasReactions ? '12px' : undefined }}
    >
      {/* Voice message */}
      {!isDeleted && ctype === 'voice' ? (
        <VoicePlayer url={msg.voice_url} isOwn={isOwn} duration={msg.voice_duration} />
      ) : !isDeleted && ctype === 'file' ? (
        <FileMessage url={msg.file_url} name={msg.file_name} size={msg.file_size} isOwn={isOwn} />
      ) : !isDeleted && ctype === 'image' ? (
        /* ── Image Bubble ── */
        <div className="flex flex-col" style={{ maxWidth: '72%', alignItems: isOwn ? 'flex-end' : 'flex-start' }}>
          <div className={`rounded-2xl ${isOwn ? 'rounded-br-md' : 'rounded-bl-md'} overflow-hidden relative cursor-pointer group`}
            style={{
              border: isOwn ? 'none' : '1px solid var(--border)',
              boxShadow: isOwn ? '0 2px 14px rgba(99,102,241,0.25)' : 'none',
            }}
            onClick={() => setLightboxUrl(msg.image_url)}>
            {/* Sender name */}
            {!isOwn && (
              <p className="text-[9px] font-semibold px-3 pt-2" style={{ color: 'var(--accent)' }}>
                {msg.sender_username}
              </p>
            )}
            <img src={msg.image_url} alt=""
              className="max-w-full rounded-lg m-1.5"
              style={{ maxHeight: 300, objectFit: 'cover' }}
              loading="lazy" />
            {/* Hover overlay */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center">
              <span className="text-white text-2xl opacity-0 group-hover:opacity-100 transition-opacity">🔍</span>
            </div>
            {/* Time + status on image */}
            <div className="absolute bottom-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-full"
                 style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
              <span className="text-[8px] text-white/70">
                {msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
              </span>
              {isOwn && (
                <span className="text-[8px]" style={{ color: msg.status === 'read' ? '#a5f3fc' : msg.status === 'failed' ? '#f87171' : 'rgba(255,255,255,0.6)' }}>
                  {msg.status === 'failed' ? '✗' : msg.status === 'sending' ? '⟳' : msg.status === 'read' ? '✓✓' : '✓'}
                </span>
              )}
            </div>
          </div>
          {/* Failed retry */}
          {isFailed && isOwn && (
            <button onClick={() => retryMessage && retryMessage(msg)}
              className="text-[10px] font-semibold mt-1 px-2 py-0.5 rounded-lg transition-all hover:bg-red-500/20"
              style={{ color: '#f87171', border: '1px solid rgba(248,113,113,0.3)' }}>
              ↺ Tap to retry
            </button>
          )}
        </div>
      ) : !isDeleted && ctype === 'video' ? (
        /* ── Video Bubble ── */
        <div className="flex flex-col" style={{ maxWidth: '72%', alignItems: isOwn ? 'flex-end' : 'flex-start' }}>
          <div className={`rounded-2xl ${isOwn ? 'rounded-br-md' : 'rounded-bl-md'} overflow-hidden p-1.5`}
            style={{
              background: isOwn ? 'var(--accent)' : 'var(--bg-hover)',
              border: isOwn ? 'none' : '1px solid var(--border)',
              boxShadow: isOwn ? '0 2px 14px rgba(99,102,241,0.25)' : 'none',
            }}>
            {!isOwn && (
              <p className="text-[9px] font-semibold px-2 pt-1" style={{ color: 'var(--accent)' }}>
                {msg.sender_username}
              </p>
            )}
            <video src={msg.file_url} controls preload="metadata"
              className="rounded-xl max-w-full"
              style={{ maxHeight: 300 }} />
            <div className="flex items-center justify-between px-2 pt-1">
              <span className="text-[10px]" style={{ color: isOwn ? 'rgba(255,255,255,0.6)' : 'var(--text-3)' }}>
                🎬 {msg.file_name || 'Video'}
              </span>
              <span className="text-[8px]" style={{ color: isOwn ? 'rgba(255,255,255,0.45)' : 'var(--text-3)' }}>
                {msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
              </span>
            </div>
          </div>
        </div>
      ) : (
        /* ── Text / Default Bubble ── */
        <div className="flex flex-col" style={{ maxWidth: '72%', alignItems: isOwn ? 'flex-end' : 'flex-start' }}>
          <div
            className={`px-3.5 py-2.5 rounded-2xl ${isOwn ? 'rounded-br-md' : 'rounded-bl-md'} relative ${isFailed ? 'cursor-pointer' : ''}`}
            style={{
              background: isDeleted ? 'rgba(255,255,255,0.03)' : isOwn ? 'var(--accent)' : 'var(--bg-hover)',
              border: isDeleted ? '1px dashed rgba(255,255,255,0.08)' : isFailed ? '1px solid rgba(248,113,113,0.3)' : isOwn ? 'none' : '1px solid var(--border)',
              boxShadow: isOwn && !isDeleted && !isFailed ? '0 2px 14px rgba(99,102,241,0.25)' : 'none',
            }}
            onClick={isFailed && isOwn ? () => retryMessage && retryMessage(msg) : undefined}
            title={isFailed ? 'Tap to retry' : undefined}
          >
            {/* Reply quote */}
            {msg.reply_to && !isDeleted && (
              <div className="text-[9px] border-l-2 pl-2 mb-1.5 italic opacity-60"
                   style={{
                     borderColor: isOwn ? 'rgba(255,255,255,0.5)' : 'var(--accent)',
                     color: isOwn ? 'rgba(255,255,255,0.7)' : 'var(--text-2)',
                   }}>
                ↩ {msg.reply_to?.sender_username}: {msg.reply_to?.content?.slice(0, 60)}
              </div>
            )}

            {/* Sender name */}
            {!isOwn && !isDeleted && (
              <p className="text-[9px] font-semibold mb-0.5" style={{ color: 'var(--accent)' }}>
                {msg.sender_username}
              </p>
            )}

            {/* Legacy image_url for older text messages */}
            {msg.image_url && !isDeleted && ctype !== 'image' && (
              <img src={msg.image_url} alt=""
                className="rounded-xl mb-1.5 max-w-full cursor-pointer"
                style={{ maxHeight: 280 }}
                loading="lazy"
                onClick={(e) => { e.stopPropagation(); setLightboxUrl && setLightboxUrl(msg.image_url); }} />
            )}

            {/* Text or tombstone */}
            {isDeleted ? (
              <p className="text-[10px] italic" style={{ color: 'rgba(255,255,255,0.2)' }}>🗑️ Message deleted</p>
            ) : msg.content && ctype !== 'image' && (
              <p className="text-xs leading-relaxed whitespace-pre-wrap"
                 style={{ color: isOwn ? '#fff' : 'var(--text-1)' }}>
                {msg.content}
              </p>
            )}

            {/* Failed indicator */}
            {isFailed && isOwn && (
              <p className="text-[9px] mt-1 flex items-center gap-1" style={{ color: '#f87171' }}>
                ⚠ Failed · Tap to retry
              </p>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between mt-1.5 gap-2">
              <p className="text-[8px]"
                 style={{ color: isOwn ? 'rgba(255,255,255,0.45)' : 'var(--text-3)' }}>
                {msg.created_at
                  ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : ''}
              </p>
              <div className="flex items-center gap-1">
                {isOwn && !isDeleted && (
                  <span className="text-[8px]" style={{
                    color: msg.status === 'read' ? '#a5f3fc'
                      : msg.status === 'sending' ? 'rgba(255,255,255,0.25)'
                      : msg.status === 'failed' ? '#f87171'
                      : 'rgba(255,255,255,0.4)',
                  }}>
                    {msg.status === 'failed' ? '✗'
                      : msg.status === 'sending' ? '⟳'
                      : msg.status === 'read' ? '✓✓'
                      : msg.status === 'delivered' ? '✓✓'
                      : '✓'}
                  </span>
                )}
                {!isDeleted && !isFailed && (
                  <>
                    <button onClick={() => setReplyTo && setReplyTo(msg)}
                      className="text-[9px] opacity-0 group-hover:opacity-60 hover:opacity-100 transition-opacity"
                      style={{ color: isOwn ? 'rgba(255,255,255,0.7)' : 'var(--text-2)' }}>↩</button>
                    {/* Emoji picker trigger */}
                    <div className="relative">
                      <button
                        className="text-[9px] opacity-0 group-hover:opacity-60 hover:opacity-100 transition-opacity"
                        style={{ color: isOwn ? 'rgba(255,255,255,0.7)' : 'var(--text-2)' }}
                        onClick={e => {
                          e.stopPropagation();
                          const el = e.currentTarget.nextSibling;
                          el.style.display = el.style.display === 'flex' ? 'none' : 'flex';
                        }}
                      >😊</button>
                      <div
                        style={{ display: 'none', position: 'absolute', bottom: '120%', right: 0, zIndex: 99 }}
                        className="flex gap-1 bg-[#1a1a2e] border border-white/10 rounded-xl p-1.5 shadow-2xl"
                        onClick={e => e.stopPropagation()}
                      >
                        {QUICK_EMOJIS.map(em => (
                          <button key={em}
                            className="text-sm leading-none hover:scale-125 transition-transform"
                            onClick={ev => {
                              reactMsg && reactMsg(msg.id, em);
                              ev.currentTarget.closest('[style]').style.display = 'none';
                            }}
                          >{em}</button>
                        ))}
                      </div>
                    </div>
                    {/* Delete (own messages only) */}
                    {isOwn && (
                      <button
                        onClick={() => deleteMsg && deleteMsg(msg.id)}
                        className="text-[9px] opacity-0 group-hover:opacity-50 hover:opacity-100 transition-opacity"
                        style={{ color: '#f87171' }}
                        title="Delete"
                      >🗑</button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
          {/* Reaction bubbles */}
          {hasReactions && (
            <div className={`flex flex-wrap gap-1 mt-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
              {Object.entries(reactions).map(([em, users]) => (
                <button key={em}
                  onClick={() => reactMsg && reactMsg(msg.id, em)}
                  className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] transition-all hover:scale-110"
                  style={{
                    background: users.includes(String(currentUser?.id)) ? 'rgba(99,102,241,0.25)' : 'rgba(255,255,255,0.07)',
                    border: users.includes(String(currentUser?.id)) ? '1px solid rgba(99,102,241,0.4)' : '1px solid rgba(255,255,255,0.1)',
                  }}
                >
                  <span>{em}</span><span style={{ color: 'var(--text-3)' }}>{users.length}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}, (prevProps, nextProps) => {
  // Check deep equality mostly on msg object
  return (
    prevProps.msg.id === nextProps.msg.id &&
    prevProps.msg.status === nextProps.msg.status &&
    prevProps.msg.deleted === nextProps.msg.deleted &&
    prevProps.msg.reactions === nextProps.msg.reactions &&
    // Check callback identity (which should ideally be stable using useCallback)
    prevProps.currentUser?.id === nextProps.currentUser?.id
  );
});

export default MessageBubble;

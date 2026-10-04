import { useEffect, useMemo, useRef, useState } from "react";
import { api, API_URL } from "./api";
import { useVoice } from "./useVoice";

// Deterministic gradient generator for beautiful avatars
const GRADIENTS = [
  "linear-gradient(135deg, #6366f1 0%, #a855f7 100%)",
  "linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)",
  "linear-gradient(135deg, #ec4899 0%, #f43f5e 100%)",
  "linear-gradient(135deg, #10b981 0%, #14b8a6 100%)",
  "linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)",
  "linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)",
  "linear-gradient(135deg, #0ea5e9 0%, #3b82f6 100%)",
  "linear-gradient(135deg, #14b8a6 0%, #06b6d4 100%)",
];

function getAvatarStyle(name) {
  let hash = 0;
  for (let i = 0; i < (name || "").length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const idx = Math.abs(hash) % GRADIENTS.length;
  return { background: GRADIENTS[idx] };
}

// Clean Modern SVG Icons
function HashIcon({ className = "w-4 h-4" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" y1="9" x2="20" y2="9" />
      <line x1="4" y1="15" x2="20" y2="15" />
      <line x1="10" y1="3" x2="8" y2="21" />
      <line x1="16" y1="3" x2="14" y2="21" />
    </svg>
  );
}

function SpeakerIcon({ className = "w-4 h-4" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </svg>
  );
}

function MicIcon({ muted = false, className = "w-4 h-4" }) {
  if (muted) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="1" y1="1" x2="23" y2="23" />
        <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
        <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" />
        <line x1="12" y1="19" x2="12" y2="23" />
        <line x1="8" y1="23" x2="16" y2="23" />
      </svg>
    );
  }
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  );
}

function HeadphoneIcon({ deafened = false, className = "w-4 h-4" }) {
  if (deafened) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="1" y1="1" x2="23" y2="23" />
        <path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 15-6.7" />
        <path d="M21 14a2 2 0 0 0-2-2h-1m3 2v5a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3" />
      </svg>
    );
  }
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
      <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
    </svg>
  );
}

function DisconnectIcon({ className = "w-4 h-4" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

function SendIcon({ className = "w-4 h-4" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}

function LogoutIcon({ className = "w-4 h-4" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

function VerifiedBadge() {
  return (
    <svg className="badge-icon" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
    </svg>
  );
}

export default function Chat({ user, onLogout }) {
  const [workspace, setWorkspace] = useState({
    server: { name: "NexTalk" },
    channels: [],
    members: [],
  });
  const [online, setOnline] = useState([]);
  const [activeChannel, setActiveChannel] = useState(null);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [socketState, setSocketState] = useState("connecting");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [showMemberSidebar, setShowMemberSidebar] = useState(true);

  const socketRef = useRef(null);
  const reconnectRef = useRef(null);
  const activeChannelRef = useRef(null);
  const messagesEndRef = useRef(null);

  const voice = useVoice({ userId: user.id, socketRef, online });

  useEffect(() => {
    activeChannelRef.current = activeChannel;
  }, [activeChannel]);

  useEffect(() => {
    api("/api/state")
      .then((data) => {
        setWorkspace({
          server: data.server,
          channels: data.channels || [],
          members: data.members || [],
        });
        setOnline(data.online || []);
        const firstText = (data.channels || []).find((c) => c.type === "text");
        if (firstText) setActiveChannel(firstText);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (!activeChannel) return;
    api(`/api/channels/${activeChannel.id}/messages`)
      .then((data) => {
        setMessages(data.messages || []);
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 80);
      })
      .catch(console.error);
  }, [activeChannel]);

  useEffect(() => {
    let cancelled = false;
    let retry = 1000;

    function connect() {
      if (cancelled) return;

      setSocketState("connecting");
      const token = localStorage.getItem("nextalk_token");
      const wsBase = API_URL.replace(/^http/, "ws");
      const ws = new WebSocket(`${wsBase}/ws?token=${encodeURIComponent(token)}`);
      socketRef.current = ws;

      ws.onopen = () => {
        retry = 1000;
        setSocketState("online");
        voice.rejoin();
      };

      ws.onerror = () => setSocketState("offline");

      ws.onclose = () => {
        setSocketState("offline");
        if (!cancelled) {
          reconnectRef.current = setTimeout(connect, retry);
          retry = Math.min(retry * 2, 10000);
        }
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === "chat" && data.channel_id === activeChannelRef.current?.id) {
            setMessages((old) => {
              if (old.some((item) => item.id === data.id)) return old;
              return [...old, data];
            });
            setTimeout(() => {
              messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
            }, 50);
          }

          if (data.type === "presence") {
            setOnline(data.users || []);
          }

          if (data.type === "voice_signal") {
            voice.handleSignal(data.from, data.signal);
          }
        } catch (err) {
          console.error(err);
        }
      };
    }

    connect();

    return () => {
      cancelled = true;
      clearTimeout(reconnectRef.current);
      socketRef.current?.close();
    };
  }, [voice.handleSignal, voice.rejoin]);

  function send(event) {
    event.preventDefault();
    const text = message.trim();
    const ws = socketRef.current;

    if (!text || !activeChannel || !ws || ws.readyState !== WebSocket.OPEN) return;

    ws.send(JSON.stringify({
      type: "chat",
      channel_id: activeChannel.id,
      text,
    }));
    setMessage("");
  }

  const onlineIds = useMemo(
    () => new Set(online.map((item) => item.id)),
    [online]
  );

  const textChannels = workspace.channels.filter((c) => c.type === "text");
  const voiceChannels = workspace.channels.filter((c) => c.type === "voice");
  const voiceUsers = online.filter((p) => p.voice_room === voice.channel?.id);

  // Group members into online vs offline
  const onlineMembers = workspace.members.filter((m) => onlineIds.has(m.id));
  const offlineMembers = workspace.members.filter((m) => !onlineIds.has(m.id));

  return (
    <div className={`app-shell ${mobileNavOpen ? "mobile-nav-open" : ""}`}>
      {/* Mobile Backdrop */}
      <button className="mobile-backdrop" aria-label="Close navigation" onClick={() => setMobileNavOpen(false)} />

      {/* 1. Far Left Server Rail */}
      <aside className="server-rail">
        <div className="server-pill-container active">
          <span className="server-active-indicator" />
          <button className="server-rail-btn active" title="NexTalk Home">
            <span className="server-rail-text">N</span>
          </button>
        </div>

        <div className="server-divider" />

        <button className="server-rail-btn add-btn" title="Add Workspace (Coming soon)">
          <span>+</span>
        </button>

        <button className="server-rail-btn explore-btn" title="Discover Public Groups">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
            <circle cx="12" cy="12" r="10" />
            <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
          </svg>
        </button>
      </aside>

      {/* 2. Middle Sidebar (Channel & Navigation) */}
      <aside className="sidebar">
        <button className="mobile-close" aria-label="Close navigation" onClick={() => setMobileNavOpen(false)}>×</button>

        {/* Server Header */}
        <div className="workspace-head">
          <div className="workspace-info">
            <div className="workspace-title-row">
              <strong>{workspace.server?.name || "NexTalk"}</strong>
              <VerifiedBadge />
            </div>
            <span className="workspace-sub">Private Community</span>
          </div>
          <div className={`connection-badge ${socketState}`}>
            <span className="pulse-dot" />
            <span>{socketState}</span>
          </div>
        </div>

        {/* Channels Section */}
        <div className="channels-scroll">
          {/* Text Channels */}
          <div className="channel-block">
            <div className="section-title">
              <span>TEXT CHANNELS</span>
              <span className="section-count">{textChannels.length}</span>
            </div>
            <div className="channel-list">
              {textChannels.map((channel) => (
                <button
                  key={channel.id}
                  className={`channel-item ${activeChannel?.id === channel.id ? "active" : ""}`}
                  onClick={() => { setActiveChannel(channel); setMobileNavOpen(false); }}
                >
                  <HashIcon className="channel-icon" />
                  <span className="channel-label">{channel.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Voice Channels */}
          <div className="channel-block">
            <div className="section-title">
              <span>VOICE ROOMS</span>
              <span className="section-count">{voiceChannels.length}</span>
            </div>
            <div className="channel-list">
              {voiceChannels.map((channel) => {
                const roomMembers = online.filter((p) => p.voice_room === channel.id);
                const isCurrent = voice.channel?.id === channel.id;

                return (
                  <div key={channel.id} className="voice-channel-wrapper">
                    <button
                      className={`channel-item voice-item ${isCurrent ? "active in-call" : ""}`}
                      onClick={() => { voice.join(channel); setMobileNavOpen(false); }}
                    >
                      <SpeakerIcon className="channel-icon" />
                      <span className="channel-label">{channel.name}</span>
                      {roomMembers.length > 0 && (
                        <span className="voice-counter">
                          <span className="live-dot" />
                          {roomMembers.length}
                        </span>
                      )}
                    </button>

                    {/* Show participants inside the voice channel */}
                    {roomMembers.length > 0 && (
                      <div className="voice-members-list">
                        {roomMembers.map((m) => (
                          <div key={m.id} className="voice-member-row">
                            <div className="member-avatar-mini" style={getAvatarStyle(m.display_name || m.username)}>
                              {(m.display_name || m.username)[0].toUpperCase()}
                            </div>
                            <span className="voice-member-name">{m.display_name || m.username}</span>
                            {m.id === user.id && voice.muted && (
                              <MicIcon muted className="mini-icon text-muted" />
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Voice Connected Dock (Appears when user joins a voice room) */}
        {voice.channel && (
          <div className="voice-dock">
            <div className="voice-dock-header">
              <div className="voice-dock-status">
                <span className="wave-bars">
                  <span className="bar" />
                  <span className="bar" />
                  <span className="bar" />
                </span>
                <div>
                  <strong>Voice Connected</strong>
                  <span className="voice-channel-name">{voice.channel.name}</span>
                </div>
              </div>
              <button
                className="voice-control-btn disconnect-btn"
                title="Disconnect"
                onClick={() => voice.leave(true)}
              >
                <DisconnectIcon />
              </button>
            </div>

            <div className="voice-dock-actions">
              <button
                className={`voice-action-pill ${voice.muted ? "muted" : ""}`}
                onClick={voice.toggleMute}
              >
                <MicIcon muted={voice.muted} />
                <span>{voice.muted ? "Unmute" : "Mute"}</span>
              </button>

              <button
                className={`voice-action-pill ${voice.deafened ? "deafened" : ""}`}
                onClick={voice.toggleDeafen}
              >
                <HeadphoneIcon deafened={voice.deafened} />
                <span>{voice.deafened ? "Undeafen" : "Deafen"}</span>
              </button>
            </div>
          </div>
        )}

        {voice.error && <div className="voice-error-toast">{voice.error}</div>}

        {/* User Profile Bar */}
        <div className="user-profile-bar">
          <div className="user-profile-left">
            <div className="avatar-wrapper">
              <div className="avatar" style={getAvatarStyle(user.display_name || user.username)}>
                {(user.display_name || user.username || "U")[0].toUpperCase()}
              </div>
              <span className={`status-dot ${socketState}`} />
            </div>
            <div className="user-names">
              <strong className="display-name">{user.display_name || user.username}</strong>
              <span className="username-tag">@{user.username}</span>
            </div>
          </div>

          <button className="user-logout-btn" title="Sign out" onClick={onLogout}>
            <LogoutIcon />
          </button>
        </div>
      </aside>

      {/* 3. Main Chat View */}
      <main className="chat">
        {/* Chat Header */}
        <header className="chat-head">
          <div className="chat-head-left">
            <button className="mobile-menu" aria-label="Open navigation" onClick={() => setMobileNavOpen(true)}>☰</button>
            <div className="channel-title-box">
              <HashIcon className="title-hash-icon" />
              <h2>{activeChannel?.name || "general"}</h2>
            </div>
            <div className="header-divider" />
            <span className="channel-topic">NexTalk real-time chat & signaling room</span>
          </div>

          <div className="chat-head-right">
            <div className="online-pill">
              <span className="pulse-green-dot" />
              <span>{onlineIds.size} Online</span>
            </div>

            <button
              className={`header-tool-btn ${showMemberSidebar ? "active" : ""}`}
              title="Toggle Member List"
              onClick={() => setShowMemberSidebar(!showMemberSidebar)}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </button>
          </div>
        </header>

        {/* Message Stream */}
        <section className="message-list">
          {/* Welcome Banner */}
          <div className="channel-hero">
            <div className="hero-icon-box">
              <HashIcon className="w-8 h-8 text-white" />
            </div>
            <h3>Welcome to #{activeChannel?.name || "general"}!</h3>
            <p>This is the start of the #{activeChannel?.name || "general"} channel. Messages are synced and stored in real-time.</p>
          </div>

          {messages.map((item, idx) => {
            const isOwn = item.author_id === user.id || item.author === user.display_name || item.author === user.username;
            const prevMsg = messages[idx - 1];
            const isConsecutive = prevMsg && prevMsg.author_id === item.author_id && (new Date(item.sent_at) - new Date(prevMsg.sent_at) < 180000);

            return (
              <article className={`message-row ${isConsecutive ? "consecutive" : ""}`} key={item.id}>
                {!isConsecutive ? (
                  <div className="msg-avatar" style={getAvatarStyle(item.author)}>
                    {(item.author || "U")[0].toUpperCase()}
                  </div>
                ) : (
                  <div className="msg-avatar-placeholder">
                    <span className="hover-time">
                      {new Date(item.sent_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                )}

                <div className="msg-content-wrapper">
                  {!isConsecutive && (
                    <div className="msg-meta">
                      <strong className="msg-author">{item.author}</strong>
                      {isOwn && <span className="author-tag you">YOU</span>}
                      <span className="msg-timestamp">
                        {new Date(item.sent_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  )}
                  <p className="msg-text">{item.text}</p>
                </div>
              </article>
            );
          })}
          <div ref={messagesEndRef} />
        </section>

        {/* Message Composer */}
        <div className="composer-wrapper">
          <form className="composer-form" onSubmit={send}>
            <button type="button" className="composer-icon-btn attachment-btn" title="Add File">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="w-4 h-4">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>

            <input
              className="composer-input"
              maxLength={4000}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={`Message #${activeChannel?.name || "general"}...`}
            />

            <div className="composer-right-actions">
              <button
                type="submit"
                className={`composer-send-btn ${message.trim() ? "has-text" : ""}`}
                disabled={!message.trim()}
                title="Send Message"
              >
                <SendIcon />
              </button>
            </div>
          </form>
          <div className="composer-hints">
            <span>Press <strong>Enter</strong> to send</span>
          </div>
        </div>
      </main>

      {/* 4. Right Members Sidebar */}
      {showMemberSidebar && (
        <aside className="members-sidebar">
          {/* Online Section */}
          <div className="members-section">
            <div className="members-section-head">
              <span>ONLINE</span>
              <span className="count-pill">{onlineMembers.length}</span>
            </div>

            <div className="members-list">
              {onlineMembers.map((member) => {
                const live = online.find((p) => p.id === member.id);
                const inVoice = Boolean(live?.voice_room);

                return (
                  <div className="member-card" key={member.id}>
                    <div className="member-avatar-box">
                      <div className="avatar small" style={getAvatarStyle(member.display_name || member.username)}>
                        {(member.display_name || member.username)[0].toUpperCase()}
                      </div>
                      <span className="status-indicator online" />
                    </div>

                    <div className="member-details">
                      <div className="member-name-row">
                        <strong>{member.display_name || member.username}</strong>
                        {member.id === user.id && <span className="member-chip you">YOU</span>}
                      </div>
                      <span className="member-sub-status">
                        {inVoice ? (
                          <span className="in-voice-tag">
                            <SpeakerIcon className="mini-icon" /> In voice
                          </span>
                        ) : (
                          "Active now"
                        )}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Offline Section */}
          {offlineMembers.length > 0 && (
            <div className="members-section">
              <div className="members-section-head">
                <span>OFFLINE</span>
                <span className="count-pill">{offlineMembers.length}</span>
              </div>

              <div className="members-list">
                {offlineMembers.map((member) => (
                  <div className="member-card offline" key={member.id}>
                    <div className="member-avatar-box">
                      <div className="avatar small desaturated" style={getAvatarStyle(member.display_name || member.username)}>
                        {(member.display_name || member.username)[0].toUpperCase()}
                      </div>
                      <span className="status-indicator offline" />
                    </div>

                    <div className="member-details">
                      <div className="member-name-row">
                        <strong>{member.display_name || member.username}</strong>
                      </div>
                      <span className="member-sub-status">Offline</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>
      )}
    </div>
  );
}

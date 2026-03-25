"""
═══════════════════════════════════════════════════════════
  ai_engine.py — AI-Powered Chat Engine
  Smart replies, summarization, toxicity detection, Study Mode
═══════════════════════════════════════════════════════════

Features:
  1. Smart Reply Suggestions — Context-aware quick responses
  2. Message Summarization — Condense long conversations
  3. Toxicity Detection — Flag harmful/toxic messages
  4. Study Mode Tutor — AI-powered study assistant
"""
import re
import random
import time
import logging
from typing import Dict, Any, List, Optional
from collections import Counter

logger = logging.getLogger("SmartChatX.AI")


# ═════════════════════════════════════════════════════════
#  TOXICITY DETECTOR
# ═════════════════════════════════════════════════════════

class ToxicityDetector:
    """Detects toxic, offensive, or harmful content in messages."""

    TOXIC_PATTERNS = [
        r'\b(hate|kill|die|stupid|idiot|dumb|ugly|loser|trash|garbage)\b',
        r'\b(shut\s*up|go\s*away|nobody\s*(likes|cares|asked))\b',
        r'\b(worst|terrible|horrible|disgusting|pathetic|worthless)\b',
    ]

    SEVERITY_WEIGHTS = {
        'mild': 0.3,
        'moderate': 0.6,
        'severe': 0.9,
    }

    MILD_WORDS = {'stupid', 'dumb', 'ugly', 'trash', 'garbage', 'worst', 'terrible', 'horrible'}
    MODERATE_WORDS = {'idiot', 'loser', 'pathetic', 'worthless', 'disgusting', 'shut up'}
    SEVERE_WORDS = {'hate', 'kill', 'die'}

    def analyze(self, text: str) -> Dict[str, Any]:
        """Analyze a message for toxicity."""
        if not text:
            return {"toxic": False, "score": 0.0, "flags": [], "severity": "none"}

        text_lower = text.lower().strip()
        flags = []
        max_severity = 'none'
        total_score = 0.0

        # Check against known toxic patterns
        for pattern in self.TOXIC_PATTERNS:
            matches = re.findall(pattern, text_lower)
            for match in matches:
                word = match if isinstance(match, str) else match[0]
                word_clean = word.strip().lower()

                if word_clean in self.SEVERE_WORDS:
                    severity = 'severe'
                elif word_clean in self.MODERATE_WORDS:
                    severity = 'moderate'
                else:
                    severity = 'mild'

                flags.append({"word": word_clean, "severity": severity})
                weight = self.SEVERITY_WEIGHTS.get(severity, 0.3)
                total_score = max(total_score, weight)

                if self.SEVERITY_WEIGHTS.get(severity, 0) > self.SEVERITY_WEIGHTS.get(max_severity, 0):
                    max_severity = severity

        # Caps lock detection (shouting)
        if len(text) > 5:
            upper_ratio = sum(1 for c in text if c.isupper()) / max(len(text), 1)
            if upper_ratio > 0.7:
                total_score = min(total_score + 0.15, 1.0)
                flags.append({"word": "EXCESSIVE_CAPS", "severity": "mild"})

        # Excessive punctuation
        if text.count('!') > 3 or text.count('?') > 3:
            total_score = min(total_score + 0.05, 1.0)

        is_toxic = total_score >= 0.3

        return {
            "toxic": is_toxic,
            "score": round(total_score, 3),
            "flags": flags,
            "severity": max_severity if is_toxic else "none",
        }


# ═════════════════════════════════════════════════════════
#  SMART REPLY GENERATOR
# ═════════════════════════════════════════════════════════

class SmartReplyGenerator:
    """Generates context-aware smart reply suggestions."""

    GREETING_TRIGGERS = ['hello', 'hi', 'hey', 'sup', 'yo', 'whats up', "what's up", 'good morning', 'good evening']
    QUESTION_TRIGGERS = ['?', 'how', 'what', 'where', 'when', 'why', 'who', 'which', 'can you', 'could you', 'do you']
    AGREEMENT_TRIGGERS = ['agree', 'right', 'true', 'exactly', 'correct', 'yes', 'yeah', 'yep', 'sure']
    FAREWELL_TRIGGERS = ['bye', 'goodbye', 'see you', 'later', 'gotta go', 'gtg', 'cya', 'good night']
    THANKS_TRIGGERS = ['thanks', 'thank you', 'thx', 'ty', 'appreciated']
    HELP_TRIGGERS = ['help', 'assist', 'support', 'guide', 'explain', 'stuck']

    GREETING_REPLIES = [
        "Hey! 👋 How's it going?",
        "Hi there! What's up?",
        "Hello! 🌟 Great to see you!",
        "Hey! Ready to chat? 🚀",
    ]

    QUESTION_REPLIES = [
        "That's a great question! 🤔",
        "Let me think about that...",
        "Interesting question! Here's my take:",
        "Good point! I'd say...",
    ]

    AGREEMENT_REPLIES = [
        "Absolutely! 💯",
        "I totally agree!",
        "You're right about that! ✅",
        "Couldn't agree more! 🎯",
    ]

    FAREWELL_REPLIES = [
        "See you later! 👋",
        "Bye! Take care! 🌟",
        "Catch you later! ✌️",
        "Until next time! 🚀",
    ]

    THANKS_REPLIES = [
        "You're welcome! 😊",
        "Happy to help! 🎉",
        "No problem at all!",
        "Anytime! 💪",
    ]

    HELP_REPLIES = [
        "I'm here to help! What do you need? 🤝",
        "Sure, let me assist you! 🛠️",
        "Of course! Ask me anything 📚",
        "Happy to help! What's the issue? 🔧",
    ]

    GENERIC_REPLIES = [
        "Interesting! Tell me more 🧐",
        "That's cool! 🔥",
        "I see what you mean 💡",
        "Nice! 🎉",
        "Sounds good! 👍",
    ]

    def generate(self, message: str, context: Optional[List[str]] = None) -> List[str]:
        """Generate smart reply suggestions based on message content."""
        if not message:
            return self.GENERIC_REPLIES[:3]

        msg_lower = message.lower().strip()
        replies = []

        # Check message type and generate appropriate replies
        if any(t in msg_lower for t in self.GREETING_TRIGGERS):
            replies = random.sample(self.GREETING_REPLIES, min(3, len(self.GREETING_REPLIES)))
        elif any(t in msg_lower for t in self.FAREWELL_TRIGGERS):
            replies = random.sample(self.FAREWELL_REPLIES, min(3, len(self.FAREWELL_REPLIES)))
        elif any(t in msg_lower for t in self.THANKS_TRIGGERS):
            replies = random.sample(self.THANKS_REPLIES, min(3, len(self.THANKS_REPLIES)))
        elif any(t in msg_lower for t in self.HELP_TRIGGERS):
            replies = random.sample(self.HELP_REPLIES, min(3, len(self.HELP_REPLIES)))
        elif any(t in msg_lower for t in self.QUESTION_TRIGGERS):
            replies = random.sample(self.QUESTION_REPLIES, min(3, len(self.QUESTION_REPLIES)))
        elif any(t in msg_lower for t in self.AGREEMENT_TRIGGERS):
            replies = random.sample(self.AGREEMENT_REPLIES, min(3, len(self.AGREEMENT_REPLIES)))
        else:
            replies = random.sample(self.GENERIC_REPLIES, min(3, len(self.GENERIC_REPLIES)))

        return replies[:3]


# ═════════════════════════════════════════════════════════
#  MESSAGE SUMMARIZER
# ═════════════════════════════════════════════════════════

class MessageSummarizer:
    """Summarizes chat conversations."""

    def summarize(self, messages: List[Dict[str, Any]], max_summary_lines: int = 5) -> Dict[str, Any]:
        """Create a summary of recent messages."""
        if not messages:
            return {
                "summary": "No messages to summarize.",
                "message_count": 0,
                "participants": [],
                "key_topics": [],
                "time_span": "N/A",
            }

        # Extract data
        participants = list(set(m.get("sender_username", "unknown") for m in messages))
        contents = [m.get("content", "") for m in messages if m.get("content")]

        # Extract key topics using simple word frequency
        all_words = []
        stop_words = {'the', 'is', 'at', 'which', 'on', 'a', 'an', 'and', 'or', 'but',
                       'in', 'to', 'for', 'of', 'with', 'it', 'this', 'that', 'was',
                       'are', 'be', 'has', 'have', 'had', 'do', 'does', 'did', 'will',
                       'would', 'could', 'should', 'may', 'might', 'i', 'you', 'he',
                       'she', 'we', 'they', 'me', 'him', 'her', 'us', 'them', 'my',
                       'your', 'his', 'its', 'our', 'their', 'so', 'if', 'not', 'no',
                       'yes', 'can', 'just', 'also', 'then', 'than', 'when', 'what'}

        for content in contents:
            words = re.findall(r'\b[a-zA-Z]{3,}\b', content.lower())
            all_words.extend(w for w in words if w not in stop_words)

        word_freq = Counter(all_words)
        key_topics = [word for word, _ in word_freq.most_common(5)]

        # Protocol distribution
        protocols = Counter(m.get("protocol", "TCP") for m in messages)

        # Time span
        timestamps = [m.get("created_at", "") for m in messages if m.get("created_at")]
        time_span = "N/A"
        if len(timestamps) >= 2:
            time_span = f"{timestamps[0][:16]} → {timestamps[-1][:16]}"

        # Generate summary text
        summary_lines = []
        summary_lines.append(f"📊 **{len(messages)} messages** from **{len(participants)} participant(s)**")

        if key_topics:
            summary_lines.append(f"🔑 Key topics: {', '.join(key_topics[:3])}")

        for proto, count in protocols.items():
            emoji = "🔵" if proto == "TCP" else "🟣" if proto == "UDP" else "🟡"
            summary_lines.append(f"{emoji} {proto}: {count} message(s)")

        if len(contents) > 0:
            avg_len = sum(len(c) for c in contents) / len(contents)
            summary_lines.append(f"📝 Avg message length: {int(avg_len)} chars")

        return {
            "summary": "\n".join(summary_lines[:max_summary_lines]),
            "message_count": len(messages),
            "participants": participants,
            "key_topics": key_topics,
            "protocol_distribution": dict(protocols),
            "time_span": time_span,
            "avg_message_length": int(sum(len(c) for c in contents) / max(len(contents), 1)),
        }


# ═════════════════════════════════════════════════════════
#  STUDY MODE TUTOR
# ═════════════════════════════════════════════════════════

class StudyModeTutor:
    """AI-powered study assistant for learning topics."""

    SUBJECTS = {
        "networking": {
            "topics": ["TCP/IP", "UDP", "HTTP", "DNS", "OSI Model", "Sockets", "Routing", "NAT", "Firewall"],
            "qa": [
                {"q": "What is TCP?", "a": "TCP (Transmission Control Protocol) is a connection-oriented protocol that ensures reliable, ordered delivery of data. It uses a 3-way handshake (SYN → SYN-ACK → ACK) to establish connections."},
                {"q": "What is UDP?", "a": "UDP (User Datagram Protocol) is a connectionless protocol that sends data without establishing a connection. It's faster but doesn't guarantee delivery, ordering, or duplicate protection."},
                {"q": "TCP vs UDP?", "a": "TCP: reliable, ordered, connection-oriented, slower. UDP: unreliable, unordered, connectionless, faster. TCP for web/email; UDP for gaming/streaming."},
                {"q": "What is WebRTC?", "a": "WebRTC (Web Real-Time Communication) enables peer-to-peer audio, video, and data sharing directly between browsers without plugins. Uses STUN/TURN for NAT traversal."},
                {"q": "What is the OSI Model?", "a": "The OSI Model has 7 layers: Physical, Data Link, Network, Transport, Session, Presentation, Application. Each layer handles specific networking functions."},
                {"q": "What are sockets?", "a": "Sockets are endpoints for communication between two machines. They combine an IP address and port number to create a unique connection point."},
                {"q": "What is NAT?", "a": "NAT (Network Address Translation) translates private IP addresses to public ones, allowing multiple devices to share one public IP address."},
                {"q": "What is DNS?", "a": "DNS (Domain Name System) translates human-readable domain names (like google.com) into IP addresses (like 142.250.80.46)."},
            ]
        },
        "programming": {
            "topics": ["Python", "JavaScript", "Algorithms", "Data Structures", "OOP", "APIs", "Databases"],
            "qa": [
                {"q": "What is an API?", "a": "API (Application Programming Interface) is a set of rules that allows different software applications to communicate. REST APIs use HTTP methods (GET, POST, PUT, DELETE)."},
                {"q": "What is OOP?", "a": "OOP (Object-Oriented Programming) organizes code into classes and objects. Key principles: Encapsulation, Inheritance, Polymorphism, Abstraction."},
                {"q": "What is a WebSocket?", "a": "WebSocket is a protocol providing full-duplex communication channels over a single TCP connection. Unlike HTTP, it maintains a persistent connection for real-time data exchange."},
            ]
        },
        "math": {
            "topics": ["Algebra", "Calculus", "Statistics", "Linear Algebra", "Discrete Math"],
            "qa": [
                {"q": "What is Big O notation?", "a": "Big O notation describes the upper bound of an algorithm's time/space complexity. Common ones: O(1) constant, O(log n) logarithmic, O(n) linear, O(n²) quadratic."},
            ]
        }
    }

    STUDY_TIPS = [
        "💡 Use the Pomodoro Technique: 25 min study, 5 min break",
        "📝 Create flashcards for key concepts",
        "🔄 Review material using spaced repetition",
        "🗣️ Teach concepts to others to reinforce learning",
        "📊 Draw diagrams to visualize relationships",
        "🎯 Focus on understanding, not memorization",
        "⏰ Study at consistent times each day",
        "🧠 Connect new info to what you already know",
    ]

    def handle_query(self, query: str) -> Dict[str, Any]:
        """Process a study mode query."""
        query_lower = query.lower().strip()

        # Check for subject-specific questions
        for subject, data in self.SUBJECTS.items():
            for qa in data["qa"]:
                q_lower = qa["q"].lower()
                # Check if query matches a known question
                key_words = set(re.findall(r'\b\w+\b', q_lower))
                query_words = set(re.findall(r'\b\w+\b', query_lower))
                overlap = len(key_words & query_words) / max(len(key_words), 1)
                if overlap > 0.5:
                    return {
                        "response": qa["a"],
                        "subject": subject,
                        "related_topics": data["topics"][:5],
                        "tip": random.choice(self.STUDY_TIPS),
                        "type": "answer",
                    }

        # Check for topic listing
        if any(w in query_lower for w in ['topics', 'subjects', 'what can', 'list', 'help']):
            all_topics = []
            for subject, data in self.SUBJECTS.items():
                all_topics.append(f"**{subject.title()}**: {', '.join(data['topics'][:5])}")
            return {
                "response": "📚 Available study topics:\n" + "\n".join(all_topics),
                "type": "topics_list",
                "tip": random.choice(self.STUDY_TIPS),
            }

        # Check if asking for a quiz
        if any(w in query_lower for w in ['quiz', 'test', 'question', 'practice']):
            subject = None
            for s in self.SUBJECTS:
                if s in query_lower:
                    subject = s
                    break
            if not subject:
                subject = random.choice(list(self.SUBJECTS.keys()))

            qa = random.choice(self.SUBJECTS[subject]["qa"])
            return {
                "response": f"🧠 **Quiz Time! ({subject.title()})**\n\n❓ {qa['q']}",
                "answer": qa["a"],
                "subject": subject,
                "type": "quiz",
                "tip": random.choice(self.STUDY_TIPS),
            }

        # Generic study tip
        if any(w in query_lower for w in ['tip', 'advice', 'how to study', 'strategy']):
            tips = random.sample(self.STUDY_TIPS, min(3, len(self.STUDY_TIPS)))
            return {
                "response": "📖 Study Tips:\n" + "\n".join(tips),
                "type": "tips",
            }

        # Default: try to find closest match
        best_match = None
        best_score = 0
        for subject, data in self.SUBJECTS.items():
            for qa in data["qa"]:
                q_words = set(re.findall(r'\b\w{3,}\b', qa["q"].lower()))
                query_w = set(re.findall(r'\b\w{3,}\b', query_lower))
                overlap = len(q_words & query_w)
                if overlap > best_score:
                    best_score = overlap
                    best_match = (subject, qa)

        if best_match and best_score >= 1:
            subject, qa = best_match
            return {
                "response": qa["a"],
                "subject": subject,
                "related_topics": self.SUBJECTS[subject]["topics"][:5],
                "type": "answer",
                "tip": random.choice(self.STUDY_TIPS),
            }

        return {
            "response": (
                "🤔 I'm not sure about that topic yet. Try asking about:\n"
                "• Networking (TCP, UDP, WebRTC, DNS, etc.)\n"
                "• Programming (APIs, OOP, WebSockets, etc.)\n"
                "• Or type `/quiz` for a practice question!"
            ),
            "type": "unknown",
            "tip": random.choice(self.STUDY_TIPS),
        }


# ═════════════════════════════════════════════════════════
#  ADAPTIVE PROTOCOL ROUTER
# ═════════════════════════════════════════════════════════

class AdaptiveProtocolRouter:
    """
    Intelligently selects the best protocol for each message type.
    
    Protocol Selection Logic:
      - Short text messages (< 100 chars) → UDP (fast, low overhead)
      - Long text messages (>= 100 chars) → TCP (reliable for large data)
      - Messages with images → TCP (must guarantee delivery)
      - Typing indicators → UDP (fire-and-forget)
      - Study mode queries → TCP (reliability matters)
      - WebRTC signaling → TCP (critical for connection setup)
      - Real-time status updates → UDP (speed > reliability)
    """

    def select_protocol(self, message_data: Dict[str, Any]) -> str:
        """Select the optimal protocol for a message."""
        msg_type = message_data.get("type", "message")
        content = message_data.get("content", "")
        has_image = bool(message_data.get("image_url"))
        user_preference = message_data.get("protocol", "AUTO")

        # If user explicitly chose a protocol and it's not AUTO, respect it
        if user_preference and user_preference.upper() in ("TCP", "UDP"):
            return user_preference.upper()

        # Image messages → always TCP (reliable delivery required)
        if has_image:
            return "TCP"

        # Typing indicators → UDP (fire and forget)
        if msg_type in ("typing", "stop_typing"):
            return "UDP"

        # Study mode → TCP (answers must be delivered)
        if content.startswith("/study") or content.startswith("/quiz"):
            return "TCP"

        # WebRTC signaling → TCP (critical)
        if msg_type in ("webrtc_offer", "webrtc_answer", "webrtc_ice"):
            return "TCP"

        # Short messages → UDP (fast)
        if len(content) < 100:
            return "UDP"

        # Long messages → TCP (reliable)
        return "TCP"

    def get_protocol_info(self, protocol: str) -> Dict[str, Any]:
        """Get information about a protocol selection."""
        info = {
            "TCP": {
                "name": "TCP",
                "label": "Reliable",
                "description": "Connection-oriented, guaranteed delivery with ACK",
                "emoji": "🔵",
                "color": "#00f0ff",
                "reliability": "guaranteed",
                "speed": "moderate",
            },
            "UDP": {
                "name": "UDP",
                "label": "Fast",
                "description": "Connectionless, best-effort, may drop packets",
                "emoji": "🟣",
                "color": "#ff2d78",
                "reliability": "best_effort",
                "speed": "fast",
            },
            "HYBRID": {
                "name": "HYBRID",
                "label": "Smart",
                "description": "TCP for critical data, UDP for real-time updates",
                "emoji": "🟡",
                "color": "#b347ea",
                "reliability": "adaptive",
                "speed": "optimized",
            },
            "WEBRTC": {
                "name": "WebRTC",
                "label": "P2P",
                "description": "Direct peer-to-peer via DataChannels",
                "emoji": "🟢",
                "color": "#00ff88",
                "reliability": "configurable",
                "speed": "fastest",
            },
        }
        return info.get(protocol, info["TCP"])


# ═════════════════════════════════════════════════════════
#  AI ENGINE — Main Class  
# ═════════════════════════════════════════════════════════

class AIEngine:
    """Main AI engine combining all AI-powered features."""

    def __init__(self):
        self.toxicity_detector = ToxicityDetector()
        self.smart_reply = SmartReplyGenerator()
        self.summarizer = MessageSummarizer()
        self.study_tutor = StudyModeTutor()
        self.protocol_router = AdaptiveProtocolRouter()
        self.stats = {
            "messages_analyzed": 0,
            "toxic_detected": 0,
            "smart_replies_generated": 0,
            "summaries_created": 0,
            "study_queries": 0,
            "protocols_routed": 0,
        }

    def process_message(self, content: str, context: Optional[List[str]] = None) -> Dict[str, Any]:
        """Full AI analysis of a message."""
        self.stats["messages_analyzed"] += 1

        # Toxicity check
        toxicity = self.toxicity_detector.analyze(content)
        if toxicity["toxic"]:
            self.stats["toxic_detected"] += 1

        # Smart replies
        replies = self.smart_reply.generate(content, context)
        self.stats["smart_replies_generated"] += 1

        return {
            "toxicity": toxicity,
            "smart_replies": replies,
        }

    def handle_study_query(self, query: str) -> Dict[str, Any]:
        """Handle a study mode query."""
        self.stats["study_queries"] += 1
        return self.study_tutor.handle_query(query)

    def summarize_messages(self, messages: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Summarize a list of messages."""
        self.stats["summaries_created"] += 1
        return self.summarizer.summarize(messages)

    def select_protocol(self, message_data: Dict[str, Any]) -> str:
        """Select optimal protocol for a message."""
        self.stats["protocols_routed"] += 1
        return self.protocol_router.select_protocol(message_data)

    def get_stats(self) -> Dict[str, Any]:
        return {**self.stats}


# ── Singleton ─────────────────────────────────────────────
ai_engine = AIEngine()

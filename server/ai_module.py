#!/usr/bin/env python3
"""
server/ai_module.py — SmartChat X AI-Augmented Messaging Layer
══════════════════════════════════════════════════════════════
Provides:
  • Auto-summarization of long messages
  • Smart reply suggestions
  • Context-aware responses
  • Toxic/spam detection with confidence scoring
  • Study Mode (AI tutor)
  
All AI is implemented locally — no external API required.
"""

import re
import random
import time
import logging
from collections import Counter, defaultdict

logger = logging.getLogger("SmartChatX.AI")


class AIModule:
    """
    Local AI engine for chat augmentation.
    Uses rule-based NLP, pattern matching, and statistical analysis.
    """

    def __init__(self):
        self.conversation_context = defaultdict(list)  # {user: [messages]}
        self.topic_tracker = Counter()
        self.processed_count = 0
        self.blocked_count = 0
        logger.info("🧠 AI Module initialized — all local processing")

        # Smart reply templates organized by detected intent
        self.reply_templates = {
            "greeting": [
                "Hey! How's it going? 👋",
                "Hi there! What's up?",
                "Hello! Ready to chat? 🚀"
            ],
            "question": [
                "That's a great question! Let me think...",
                "Hmm, interesting point! 🤔",
                "Good question — what do others think?"
            ],
            "agreement": [
                "Totally agree! 👍",
                "100% with you on that!",
                "You're right about that!"
            ],
            "farewell": [
                "See you later! 👋",
                "Bye! Great chatting with you!",
                "Take care! Catch you next time! ✌️"
            ],
            "positive": [
                "That's awesome! 🎉",
                "Love it! Keep going! 💪",
                "That's really cool!"
            ],
            "negative": [
                "That's tough, hang in there! 💙",
                "Sorry to hear that. It'll get better!",
                "Keep your head up! 🌟"
            ],
            "neutral": [
                "Interesting! Tell me more 😊",
                "I see what you mean!",
                "That's a good point!",
                "Makes sense! 👍"
            ],
            "technical": [
                "Great technical insight! 🔧",
                "That's a solid approach!",
                "Nice thinking on the implementation!"
            ]
        }

        # Toxic content patterns with weights
        self.toxic_patterns = [
            (r'\b(spam|scam)\b', 0.8, "spam"),
            (r'\b(hate|hatred)\b', 0.9, "hate_speech"),
            (r'\b(stupid|idiot|dumb|moron|loser)\b', 0.6, "insult"),
            (r'\b(kill|die|murder)\b', 0.85, "violence"),
            (r'\b(abuse|harass)\b', 0.7, "harassment"),
            (r'(.)\1{4,}', 0.5, "spam_pattern"),  # Repeated characters
            (r'[A-Z\s]{20,}', 0.4, "caps_abuse"),   # All caps long text
        ]

        # Study mode knowledge base
        self.study_topics = {
            "tcp": {
                "title": "TCP — Transmission Control Protocol",
                "content": """📚 **TCP (Transmission Control Protocol)**
                
🔹 **Connection-oriented** — Three-way handshake (SYN → SYN-ACK → ACK)
🔹 **Reliable delivery** — Guarantees all packets arrive in order
🔹 **Flow control** — Uses sliding window protocol
🔹 **Congestion control** — Slow start, congestion avoidance, fast retransmit
🔹 **Error detection** — Checksum verification on every segment
🔹 **Port range** — 0-65535 (well-known: 0-1023)
🔹 **Header size** — 20-60 bytes
🔹 **Use cases** — Web (HTTP), Email (SMTP), File transfer (FTP)

⚡ **In SmartChat X**: TCP carries all chat messages for guaranteed delivery."""
            },
            "udp": {
                "title": "UDP — User Datagram Protocol",
                "content": """📚 **UDP (User Datagram Protocol)**

🔹 **Connectionless** — No handshake needed (fire-and-forget)
🔹 **Unreliable** — No delivery guarantee, packets may be lost
🔹 **No ordering** — Packets can arrive out of order
🔹 **Low overhead** — Only 8-byte header
🔹 **Fast** — Minimal latency, great for real-time data
🔹 **Broadcast support** — Can send to multiple recipients
🔹 **Use cases** — Gaming, VoIP, DNS, Streaming

⚡ **In SmartChat X**: UDP handles typing indicators and presence for speed."""
            },
            "websocket": {
                "title": "WebSocket Protocol",
                "content": """📚 **WebSocket Protocol**

🔹 **Full-duplex** — Bidirectional communication over single TCP connection
🔹 **Persistent** — Connection stays open (no polling needed)
🔹 **Low latency** — Real-time data with minimal overhead
🔹 **Upgrade from HTTP** — Starts as HTTP, upgrades via Upgrade header
🔹 **Frame-based** — Data sent in frames, not streams
🔹 **Use cases** — Chat apps, live feeds, real-time dashboards

⚡ **In SmartChat X**: WebSocket bridges browser ↔ TCP/UDP servers."""
            },
            "osi": {
                "title": "OSI Model — 7 Layers",
                "content": """📚 **OSI Reference Model**

7️⃣ **Application** — HTTP, FTP, SMTP, DNS (user-facing)
6️⃣ **Presentation** — Encryption, compression, data format
5️⃣ **Session** — Session management, authentication
4️⃣ **Transport** — TCP/UDP, port numbers, segmentation
3️⃣ **Network** — IP addressing, routing (routers)
2️⃣ **Data Link** — MAC addresses, framing (switches)
1️⃣ **Physical** — Cables, signals, bit transmission

📝 Mnemonic: **A**ll **P**eople **S**eem **T**o **N**eed **D**ata **P**rocessing"""
            },
            "encryption": {
                "title": "Encryption in Networking",
                "content": """📚 **Encryption Fundamentals**

🔹 **Symmetric** — Same key encrypts & decrypts (AES, DES)
🔹 **Asymmetric** — Public/private key pairs (RSA, ECC)
🔹 **Hashing** — One-way function (SHA-256, MD5)
🔹 **TLS/SSL** — Secure web communication (HTTPS)
🔹 **Diffie-Hellman** — Secure key exchange over insecure channel
🔹 **AES-256** — Current gold standard for symmetric encryption

⚡ **In SmartChat X**: AES-256-CBC simulation with DH key exchange."""
            },
            "socket": {
                "title": "Socket Programming",
                "content": """📚 **Socket Programming**

🔹 **Socket** — Endpoint for network communication (IP + Port)
🔹 **SOCK_STREAM** — TCP socket (connection-oriented)
🔹 **SOCK_DGRAM** — UDP socket (connectionless)
🔹 **bind()** — Associate socket with address
🔹 **listen()** — Mark socket as passive (server)
🔹 **accept()** — Accept incoming connection
🔹 **connect()** — Initiate connection to server
🔹 **send()/recv()** — Transfer data

⚡ **In SmartChat X**: Both TCP and UDP sockets are used simultaneously."""
            },
            "routing": {
                "title": "Network Routing",
                "content": """📚 **Network Routing**

🔹 **Static routing** — Manually configured routes
🔹 **Dynamic routing** — Auto-discovered (OSPF, BGP, RIP)
🔹 **Routing table** — Maps destinations to next hops
🔹 **Metrics** — Hop count, bandwidth, delay, reliability
🔹 **Load balancing** — Distribute traffic across paths
🔹 **Failover** — Automatic switch to backup route

⚡ **In SmartChat X**: Adaptive routing selects TCP/UDP based on message type."""
            }
        }

    def analyze_message(self, text: str, username: str) -> dict:
        """
        Complete AI analysis of a message.
        Returns analysis results including toxicity, sentiment, suggestions.
        """
        self.processed_count += 1

        # Store in context
        self.conversation_context[username].append({
            "text": text,
            "time": time.time()
        })
        # Keep only last 20 messages per user
        if len(self.conversation_context[username]) > 20:
            self.conversation_context[username] = self.conversation_context[username][-20:]

        # Track topics
        words = text.lower().split()
        self.topic_tracker.update(words)

        result = {
            "original": text,
            "username": username,
            "timestamp": time.time(),
            "toxicity": self._detect_toxicity(text),
            "sentiment": self._analyze_sentiment(text),
            "intent": self._detect_intent(text),
            "smart_replies": [],
            "summary": None,
            "study_response": None,
            "is_blocked": False
        }

        # Check if message should be blocked
        if result["toxicity"]["is_toxic"]:
            result["is_blocked"] = True
            result["block_reason"] = result["toxicity"]["category"]
            self.blocked_count += 1
            logger.warning(f"🚫 BLOCKED message from '{username}': "
                           f"Category={result['toxicity']['category']}, "
                           f"Score={result['toxicity']['score']:.2f}")

        # Generate smart replies
        result["smart_replies"] = self._generate_smart_replies(
            text, result["intent"], result["sentiment"]
        )

        # Auto-summarize if long
        if len(text) > 100:
            result["summary"] = self._summarize(text)

        # Check for study mode queries
        if text.startswith("/study ") or text.startswith("/learn "):
            topic = text.split(" ", 1)[1].strip().lower()
            result["study_response"] = self._study_mode(topic)

        logger.info(f"🧠 AI Analysis | User: {username} | "
                     f"Intent: {result['intent']} | "
                     f"Sentiment: {result['sentiment']['label']} | "
                     f"Toxic: {result['toxicity']['is_toxic']}")

        return result

    def _detect_toxicity(self, text: str) -> dict:
        """Detect toxic content with confidence scoring."""
        max_score = 0.0
        category = "clean"
        matches = []

        for pattern, weight, cat in self.toxic_patterns:
            found = re.findall(pattern, text, re.IGNORECASE)
            if found:
                score = min(weight * len(found), 1.0)
                matches.append({"pattern": cat, "score": score, "count": len(found)})
                if score > max_score:
                    max_score = score
                    category = cat

        return {
            "is_toxic": max_score >= 0.6,
            "score": round(max_score, 3),
            "category": category,
            "matches": matches,
            "confidence": round(min(max_score * 1.2, 1.0), 3)
        }

    def _analyze_sentiment(self, text: str) -> dict:
        """Simple rule-based sentiment analysis."""
        positive_words = {
            'good', 'great', 'awesome', 'amazing', 'love', 'like', 'happy',
            'wonderful', 'excellent', 'fantastic', 'brilliant', 'cool', 'nice',
            'best', 'beautiful', 'perfect', 'thanks', 'thank', 'yes', 'yeah',
            'wow', 'super', 'fun', 'enjoy', 'glad', '😊', '🎉', '👍', '❤️',
            '🚀', '💪', '✨', 'haha', 'lol', 'lmao'
        }
        negative_words = {
            'bad', 'terrible', 'awful', 'hate', 'dislike', 'sad', 'angry',
            'horrible', 'worst', 'ugly', 'boring', 'annoying', 'stupid',
            'fail', 'failed', 'wrong', 'problem', 'issue', 'bug', 'error',
            'no', 'not', 'never', 'don\'t', '😢', '😡', '👎', 'ugh'
        }

        words = set(text.lower().split())
        pos_count = len(words & positive_words)
        neg_count = len(words & negative_words)
        total = pos_count + neg_count

        if total == 0:
            return {"label": "neutral", "score": 0.0, "positive": 0, "negative": 0}

        score = (pos_count - neg_count) / total
        if score > 0.2:
            label = "positive"
        elif score < -0.2:
            label = "negative"
        else:
            label = "neutral"

        return {
            "label": label,
            "score": round(score, 3),
            "positive": pos_count,
            "negative": neg_count
        }

    def _detect_intent(self, text: str) -> str:
        """Classify message intent."""
        text_lower = text.lower().strip()

        # Greeting patterns
        if re.match(r'^(hi|hello|hey|yo|sup|howdy|greetings|good\s*(morning|evening|afternoon))', text_lower):
            return "greeting"

        # Question patterns
        if text_lower.endswith('?') or re.match(r'^(what|how|why|when|where|who|which|can|could|would|is|are|do|does)', text_lower):
            return "question"

        # Farewell patterns
        if re.match(r'^(bye|goodbye|see\s*ya|later|gotta go|leaving|cya|peace)', text_lower):
            return "farewell"

        # Agreement
        if re.match(r'^(yes|yeah|yep|sure|agree|right|true|exactly|definitely|absolutely)', text_lower):
            return "agreement"

        # Technical discussion
        if any(word in text_lower for word in ['code', 'programming', 'function', 'algorithm', 'server', 'tcp', 'udp', 'network', 'protocol', 'api', 'debug', 'error']):
            return "technical"

        # Sentiment-based fallback
        sentiment = self._analyze_sentiment(text)
        if sentiment["label"] == "positive":
            return "positive"
        elif sentiment["label"] == "negative":
            return "negative"

        return "neutral"

    def _generate_smart_replies(self, text: str, intent: str, sentiment: dict) -> list:
        """Generate contextual smart reply suggestions."""
        replies = list(self.reply_templates.get(intent, self.reply_templates["neutral"]))
        random.shuffle(replies)
        return replies[:3]

    def _summarize(self, text: str) -> str:
        """
        Extractive summarization — picks key sentences.
        """
        sentences = re.split(r'[.!?]+', text)
        sentences = [s.strip() for s in sentences if len(s.strip()) > 10]

        if not sentences:
            return text[:80] + "..."

        # Score sentences by word importance
        all_words = text.lower().split()
        word_freq = Counter(all_words)

        scored = []
        for sent in sentences:
            words = sent.lower().split()
            score = sum(word_freq.get(w, 0) for w in words) / max(len(words), 1)
            scored.append((score, sent))

        scored.sort(reverse=True)
        # Take top 2 sentences
        summary_parts = [s for _, s in scored[:2]]
        return ". ".join(summary_parts) + "."

    def _study_mode(self, topic: str) -> dict:
        """
        AI Tutor mode — returns educational content about CN topics.
        """
        # Search for matching topic
        topic_lower = topic.lower().strip()
        for key, data in self.study_topics.items():
            if key in topic_lower or topic_lower in key:
                logger.info(f"📚 Study Mode | Topic: {data['title']}")
                return {
                    "found": True,
                    "topic": data["title"],
                    "content": data["content"]
                }

        # Fuzzy match attempt
        for key, data in self.study_topics.items():
            if any(word in topic_lower for word in key.split()):
                return {
                    "found": True,
                    "topic": data["title"],
                    "content": data["content"]
                }

        available = ", ".join(self.study_topics.keys())
        return {
            "found": False,
            "topic": topic,
            "content": f"📝 Topic '{topic}' not found. Available topics: {available}",
            "available_topics": list(self.study_topics.keys())
        }

    def get_stats(self) -> dict:
        """Return AI module statistics."""
        return {
            "messages_processed": self.processed_count,
            "messages_blocked": self.blocked_count,
            "active_users": len(self.conversation_context),
            "top_topics": self.topic_tracker.most_common(10),
            "block_rate": round(
                self.blocked_count / max(self.processed_count, 1) * 100, 1
            )
        }


# Singleton instance
ai_engine = AIModule()

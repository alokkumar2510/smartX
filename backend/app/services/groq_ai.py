"""
═══════════════════════════════════════════════════════════
  groq_ai.py — Groq LLM-Powered AI Service
  Uses Groq's blazing-fast LLM API for real AI features
═══════════════════════════════════════════════════════════

Features powered by Groq:
  1. Intelligent Chat Replies — Real LLM-generated smart responses
  2. Advanced Study Tutor — Deep explanations powered by LLM
  3. Chat Summarization — LLM-based conversation summaries
  4. Message Translation — Translate messages to any language
  5. Code Helper — Explain/generate code snippets
"""
import os
import json
import logging
import asyncio
from typing import Dict, Any, List, Optional
from concurrent.futures import ThreadPoolExecutor

# Load .env file for API keys
try:
    from dotenv import load_dotenv
    load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), '.env'))
except ImportError:
    pass  # python-dotenv not installed, rely on env vars

logger = logging.getLogger("SmartChatX.GroqAI")

# Try to import httpx for async HTTP, fall back to requests
try:
    import httpx
    HAS_HTTPX = True
except ImportError:
    HAS_HTTPX = False
    try:
        import requests
        HAS_REQUESTS = True
    except ImportError:
        HAS_REQUESTS = False

GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL = "llama-3.3-70b-versatile"  # Groq's fastest model


class GroqAI:
    """Groq LLM-powered AI service for SmartChat X."""

    def __init__(self):
        self.api_key = os.environ.get("GROQ_API_KEY", "")
        self._executor = ThreadPoolExecutor(max_workers=2)
        self.enabled = bool(self.api_key)
        self.stats = {
            "requests_made": 0,
            "tokens_used": 0,
            "errors": 0,
        }
        if self.enabled:
            logger.info("🧠 Groq AI: ENABLED (LLM-powered features active)")
        else:
            logger.warning("🧠 Groq AI: DISABLED (set GROQ_API_KEY env variable to enable)")

    def _headers(self) -> Dict[str, str]:
        return {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

    def _call_groq_sync(self, messages: List[Dict], max_tokens: int = 500,
                         temperature: float = 0.7) -> Optional[str]:
        """Synchronous Groq API call (runs in thread pool)."""
        if not self.enabled:
            return None

        payload = {
            "model": GROQ_MODEL,
            "messages": messages,
            "max_tokens": max_tokens,
            "temperature": temperature,
        }

        try:
            if HAS_HTTPX:
                with httpx.Client(timeout=15.0) as client:
                    resp = client.post(GROQ_API_URL, headers=self._headers(), json=payload)
                    resp.raise_for_status()
                    data = resp.json()
            elif HAS_REQUESTS:
                import requests as req
                resp = req.post(GROQ_API_URL, headers=self._headers(), json=payload, timeout=15)
                resp.raise_for_status()
                data = resp.json()
            else:
                logger.error("No HTTP library available (install httpx or requests)")
                return None

            self.stats["requests_made"] += 1
            self.stats["tokens_used"] += data.get("usage", {}).get("total_tokens", 0)

            content = data["choices"][0]["message"]["content"]
            return content.strip()

        except Exception as e:
            self.stats["errors"] += 1
            logger.error(f"Groq API error: {e}")
            return None

    async def call_groq(self, messages: List[Dict], max_tokens: int = 500,
                        temperature: float = 0.7) -> Optional[str]:
        """Async Groq API call."""
        if not self.enabled:
            return None
        try:
            loop = asyncio.get_event_loop()
            result = await loop.run_in_executor(
                self._executor,
                lambda: self._call_groq_sync(messages, max_tokens, temperature)
            )
            return result
        except Exception as e:
            logger.error(f"Async Groq call failed: {e}")
            return None

    async def smart_reply(self, message: str, sender: str,
                          context: Optional[List[str]] = None) -> List[str]:
        """Generate LLM-powered smart reply suggestions."""
        context_str = ""
        if context:
            context_str = "\nRecent messages:\n" + "\n".join(f"- {m}" for m in context[-5:])

        messages = [
            {"role": "system", "content": (
                "You are a helpful chat assistant. Generate exactly 3 short, "
                "natural reply suggestions for the user to respond with. "
                "Each reply should be 1-2 sentences max. "
                "Return ONLY a JSON array of 3 strings, nothing else. "
                'Example: ["Sure thing! 👍", "I agree completely!", "Tell me more about that"]'
            )},
            {"role": "user", "content": f"{sender} says: \"{message}\"{context_str}\n\nGenerate 3 reply suggestions:"}
        ]

        result = await self.call_groq(messages, max_tokens=150, temperature=0.8)
        if result:
            try:
                # Try to parse JSON array
                cleaned = result.strip()
                if cleaned.startswith("```"):
                    cleaned = cleaned.split("\n", 1)[-1].rsplit("```", 1)[0].strip()
                replies = json.loads(cleaned)
                if isinstance(replies, list) and len(replies) >= 1:
                    return replies[:3]
            except (json.JSONDecodeError, ValueError):
                # Try to extract from text
                lines = [l.strip().strip('"').strip("'").strip('-').strip() 
                         for l in result.split('\n') if l.strip()]
                if lines:
                    return lines[:3]
        return []

    async def study_tutor(self, query: str) -> Dict[str, Any]:
        """LLM-powered study tutor with deep explanations."""
        messages = [
            {"role": "system", "content": (
                "You are an expert computer science tutor specializing in networking, "
                "programming, algorithms, and system design. "
                "Provide clear, concise explanations with examples. "
                "Use emoji and bullet points for readability. "
                "If the student asks for a quiz, provide a question and the answer. "
                "Keep responses under 300 words."
            )},
            {"role": "user", "content": query}
        ]

        result = await self.call_groq(messages, max_tokens=600, temperature=0.5)
        if result:
            return {
                "response": result,
                "type": "llm_answer",
                "model": GROQ_MODEL,
                "powered_by": "Groq",
            }
        return None

    async def summarize_chat(self, messages: List[Dict[str, Any]]) -> Optional[str]:
        """LLM-powered chat summarization."""
        if not messages:
            return None

        # Build conversation text
        convo_lines = []
        for m in messages[-30:]:  # Last 30 messages
            sender = m.get("sender_username", "unknown")
            content = m.get("content", "")
            if content:
                convo_lines.append(f"{sender}: {content}")

        if not convo_lines:
            return None

        conversation = "\n".join(convo_lines)

        msgs = [
            {"role": "system", "content": (
                "Summarize this chat conversation in 3-5 bullet points. "
                "Highlight key topics, decisions, and action items. "
                "Use emoji for visual appeal. Be concise."
            )},
            {"role": "user", "content": f"Chat conversation:\n{conversation}\n\nSummary:"}
        ]

        result = await self.call_groq(msgs, max_tokens=300, temperature=0.3)
        return result

    async def translate_message(self, text: str, target_language: str) -> Optional[str]:
        """Translate a message to the target language."""
        msgs = [
            {"role": "system", "content": f"Translate the following text to {target_language}. Return ONLY the translation, nothing else."},
            {"role": "user", "content": text}
        ]
        return await self.call_groq(msgs, max_tokens=300, temperature=0.1)

    async def explain_code(self, code: str) -> Optional[str]:
        """Explain a code snippet."""
        msgs = [
            {"role": "system", "content": (
                "Explain the following code snippet in simple terms. "
                "Use bullet points. Keep it concise (under 200 words). "
                "Mention what language it is and what it does."
            )},
            {"role": "user", "content": f"```\n{code}\n```"}
        ]
        return await self.call_groq(msgs, max_tokens=400, temperature=0.3)

    async def ai_chat(self, message: str, history: Optional[List[Dict]] = None) -> Optional[str]:
        """General AI chat — free-form conversation with the LLM."""
        messages = [
            {"role": "system", "content": (
                "You are SmartChat X AI Assistant — a friendly, knowledgeable AI embedded in a "
                "real-time chat application. You can help with networking concepts, coding, "
                "general questions, and more. Keep responses concise and use emoji. "
                "You know about TCP, UDP, WebRTC, WebSockets, and network protocols."
            )}
        ]
        if history:
            for h in history[-6:]:
                messages.append({"role": h.get("role", "user"), "content": h.get("content", "")})
        messages.append({"role": "user", "content": message})

        return await self.call_groq(messages, max_tokens=500, temperature=0.7)

    def get_stats(self) -> Dict[str, Any]:
        return {
            "enabled": self.enabled,
            "model": GROQ_MODEL,
            **self.stats,
        }


# ── Singleton ─────────────────────────────────────────────
groq_ai = GroqAI()

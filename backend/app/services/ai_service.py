"""
─── ai_service.py ────────────────────────────────────────
AI analysis service for sentiment, toxicity detection,
and smart reply generation.
"""


class AIService:
    """AI-powered message analysis service."""

    # Toxic keywords for basic filtering
    TOXIC_WORDS = {"spam", "scam", "hate"}

    def analyze_sentiment(self, text: str) -> dict:
        """Analyze message sentiment (positive/neutral/negative)."""
        positive_words = {"good", "great", "awesome", "thanks", "love", "happy"}
        negative_words = {"bad", "terrible", "hate", "angry", "sad"}

        words = set(text.lower().split())
        pos = len(words & positive_words)
        neg = len(words & negative_words)

        if pos > neg:
            return {"sentiment": "positive", "score": 0.8}
        elif neg > pos:
            return {"sentiment": "negative", "score": 0.3}
        return {"sentiment": "neutral", "score": 0.5}

    def detect_toxicity(self, text: str) -> dict:
        """Check message for toxic content."""
        words = set(text.lower().split())
        is_toxic = bool(words & self.TOXIC_WORDS)
        return {"is_toxic": is_toxic, "flagged_words": list(words & self.TOXIC_WORDS)}

    def generate_smart_replies(self, text: str) -> list:
        """Generate smart reply suggestions."""
        if "?" in text:
            return ["Yes, I agree!", "Let me think about it.", "Good question!"]
        return ["Thanks!", "Got it 👍", "Interesting!"]

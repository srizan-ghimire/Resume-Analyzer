"""Tokenisation and normalisation shared by the skill matcher and the scorer.

Deliberately free of NLTK: the previous implementation downloaded corpora at
module import time, which stalls or fails on a cold container start.
"""

from __future__ import annotations

import re

from sklearn.feature_extraction.text import ENGLISH_STOP_WORDS

STOP_WORDS = frozenset(ENGLISH_STOP_WORDS) | {
    "experience",
    "work",
    "working",
    "role",
    "job",
    "team",
    "company",
    "responsibilities",
    "requirements",
    "candidate",
    "ability",
    "years",
    "year",
    "strong",
    "good",
    "excellent",
    "looking",
    "join",
    "using",
    "will",
}

# Keeps intra-token punctuation that carries meaning for technology names:
# C++, C#, Node.js, CI/CD, .NET, ASP.NET.
_TOKEN_RE = re.compile(r"[A-Za-z0-9][A-Za-z0-9+#./_-]*|\.[A-Za-z]+")

# Characters that are meaningful inside a token but not at its edges.
_EDGE_STRIP = ".-_/"


def tokenize(text: str) -> list[str]:
    """Split text into tokens, preserving technology spellings."""
    if not text:
        return []
    tokens = []
    for raw in _TOKEN_RE.findall(text):
        token = raw.strip(_EDGE_STRIP)
        # ".NET" and ".js" keep their leading dot; strip() above would eat it.
        if raw.startswith(".") and len(raw) > 1:
            token = raw
        if token:
            tokens.append(token)
    return tokens


def normalize(text: str) -> str:
    """Lowercase and collapse whitespace, for dictionary lookups."""
    return re.sub(r"\s+", " ", text).strip().lower()


def content_tokens(text: str) -> list[str]:
    """Lowercased tokens with stop words and single characters removed."""
    return [
        token
        for token in (t.lower() for t in tokenize(text))
        if len(token) > 1 and token not in STOP_WORDS
    ]


def analyzer(text: str) -> list[str]:
    """Analyzer passed to scikit-learn's vectorisers.

    Emits unigrams plus bigrams so multi-word skills ("machine learning") carry
    weight as a unit rather than as two unrelated terms.
    """
    tokens = content_tokens(text)
    grams = list(tokens)
    grams.extend(f"{a} {b}" for a, b in zip(tokens, tokens[1:], strict=False))
    return grams

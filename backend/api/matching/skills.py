"""Canonical skill and education extraction.

The previous implementation looped ``re.search`` over 1,262 skills for every
call. Worse, a third of that vocabulary was CamelCase ("PublicSpeaking") and so
could never match real resume text at all.

This module loads a normalised vocabulary once and matches by dictionary lookup
over token n-grams: linear in the length of the text, and independent of the
size of the vocabulary.
"""

from __future__ import annotations

import csv
import functools
import re
from pathlib import Path

from .text import normalize, tokenize

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
SKILLS_CSV = DATA_DIR / "skills.csv"

# Degree names only. Bare fields of study ("Machine Learning", "Statistics") are
# deliberately excluded: they live in the skill vocabulary, and matching them
# here made every skills section look like an education section.
EDUCATION_TERMS: tuple[str, ...] = (
    "Bachelor of Science in Computer Science and Information Technology",
    "Bachelor of Science in Information Technology",
    "Bachelor of Science in Computer Science",
    "Bachelor of Computer Applications",
    "Bachelor of Computer Engineering",
    "Bachelor of Business Administration",
    "Bachelor of Software Engineering",
    "Bachelor of Information Technology",
    "Bachelor of Information Management",
    "Bachelor of Technology",
    "Bachelor of Engineering",
    "Bachelor of Science",
    "Bachelor of Commerce",
    "Bachelor of Arts",
    "Master of Science in Computer Science",
    "Master of Business Administration",
    "Master of Computer Applications",
    "Master of Software Engineering",
    "Master of Information Technology",
    "Master of Technology",
    "Master of Engineering",
    "Master of Science",
    "Master of Arts",
    "Doctor of Philosophy",
    "Associate of Applied Science",
    "Associate of Science",
    "Associate of Arts",
    "Associate Degree",
    "Bachelors",
    "Bachelor",
    "Masters",
    "Master",
    "Doctorate",
    "Diploma",
    "Certificate",
    "BSc.CSIT",
    "BSc.IT",
    "BSc.CS",
    "BTech",
    "MTech",
    "BBA",
    "MBA",
    "BBS",
    "MBS",
    "BCA",
    "MCA",
    "BIM",
    "BIT",
    "BSc",
    "MSc",
    "PhD",
    "BEng",
    "MEng",
    "BArch",
    "LLB",
    "LLM",
)


@functools.lru_cache(maxsize=1)
def _skill_index() -> tuple[dict[str, str], int]:
    """Map every normalised surface form to its canonical skill name.

    Returns the lookup table and the largest number of words any entry spans,
    which bounds the n-gram window.
    """
    lookup: dict[str, str] = {}
    max_words = 1

    if not SKILLS_CSV.exists():  # pragma: no cover - deployment guard
        raise FileNotFoundError(
            f"Skill vocabulary missing at {SKILLS_CSV}. It is tracked in git; "
            "restore it rather than regenerating."
        )

    with SKILLS_CSV.open(encoding="utf-8", newline="") as fh:
        for row in csv.DictReader(fh):
            canonical = (row.get("skill") or "").strip()
            if not canonical:
                continue
            forms = [canonical]
            forms.extend(a.strip() for a in (row.get("aliases") or "").split("|") if a.strip())
            for form in forms:
                key = normalize(form)
                if len(key) < 2:
                    continue
                # First writer wins, so a canonical name is never shadowed by
                # another skill's alias.
                lookup.setdefault(key, canonical)
                max_words = max(max_words, len(key.split()))

    return lookup, max_words


@functools.lru_cache(maxsize=1)
def _education_index() -> tuple[dict[str, str], int]:
    lookup: dict[str, str] = {}
    max_words = 1
    for term in EDUCATION_TERMS:
        key = normalize(term)
        lookup.setdefault(key, term)
        max_words = max(max_words, len(key.split()))
    return lookup, max_words


def _match_ngrams(text: str, lookup: dict[str, str], max_words: int) -> list[str]:
    """Longest-match-wins scan over token n-grams."""
    if not text:
        return []

    tokens = [t.lower().strip(".,;:()[]") for t in tokenize(text)]
    tokens = [t for t in tokens if t]

    found: list[str] = []
    seen: set[str] = set()
    i = 0
    n = len(tokens)
    while i < n:
        matched_len = 0
        matched_value = None
        for size in range(min(max_words, n - i), 0, -1):
            candidate = " ".join(tokens[i : i + size])
            value = lookup.get(candidate)
            if value is not None:
                matched_len, matched_value = size, value
                break
        if matched_value is not None:
            if matched_value not in seen:
                seen.add(matched_value)
                found.append(matched_value)
            i += matched_len
        else:
            i += 1
    return found


def extract_skills(text: str) -> list[str]:
    """Canonical skill names present in ``text``, in order of first appearance."""
    lookup, max_words = _skill_index()
    return _match_ngrams(text, lookup, max_words)


def extract_education(text: str) -> list[str]:
    """Degrees and fields of study present in ``text``."""
    lookup, max_words = _education_index()
    return _match_ngrams(text, lookup, max_words)


def skill_vocabulary_size() -> int:
    return len(set(_skill_index()[0].values()))


_YEARS_RE = re.compile(
    r"(\d+)\s*\+?\s*(?:to|-|–)?\s*(\d+)?\s*\+?\s*years?\b", re.IGNORECASE
)


def extract_required_years(text: str) -> int | None:
    """Smallest "N years of experience" figure stated in a job description."""
    values = [int(m.group(1)) for m in _YEARS_RE.finditer(text or "") if m.group(1)]
    sane = [v for v in values if 0 < v <= 40]
    return min(sane) if sane else None

"""Similarity scoring: TF-IDF cosine blended with BM25.

Replaces the hand-rolled TF/IDF/cosine implementation that lived in views.py and
re-vectorised the entire job corpus on every single request.

Two signals are combined because they fail differently:

* **TF-IDF cosine** normalises for length, so a short resume is not penalised
  against a long job description.
* **BM25** saturates term frequency, so a resume that repeats "Python" twenty
  times does not outrank one that genuinely covers more of the requirements.

A third component scores direct overlap of the canonical skill vocabulary, which
is what a user actually sees explained in the UI.
"""

from __future__ import annotations

import math
import threading
from dataclasses import dataclass

import numpy as np
from rank_bm25 import BM25Okapi
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from .skills import extract_skills
from .text import analyzer, content_tokens

# Relative contribution of each signal. Skill overlap is weighted highest
# because it is the most precise and the most explainable.
WEIGHT_SKILLS = 0.45
WEIGHT_TFIDF = 0.35
WEIGHT_BM25 = 0.20


@dataclass(frozen=True)
class ScoredJob:
    job_id: int
    score: float
    matched_skills: tuple[str, ...]
    missing_skills: tuple[str, ...]

    @property
    def percentage(self) -> int:
        return round(self.score * 100)


class JobCorpus:
    """Fitted vectoriser plus per-job vectors for a fixed set of jobs.

    Built once per job-corpus revision and held in the process. Rebuilt when
    :func:`invalidate_corpus_cache` bumps the revision.
    """

    def __init__(self, job_ids: list[int], documents: list[str], skill_sets: list[list[str]]):
        self.job_ids = job_ids
        self.skill_sets = [set(s) for s in skill_sets]

        if documents:
            self.vectorizer = TfidfVectorizer(
                analyzer=analyzer,
                sublinear_tf=True,
                min_df=1,
                max_df=0.9 if len(documents) > 10 else 1.0,
            )
            self.matrix = self.vectorizer.fit_transform(documents)
            self.bm25 = BM25Okapi([content_tokens(d) for d in documents])
        else:
            self.vectorizer = None
            self.matrix = None
            self.bm25 = None

    def __len__(self) -> int:
        return len(self.job_ids)

    def score(self, resume_text: str, resume_skills: list[str]) -> list[ScoredJob]:
        if not self.job_ids or self.vectorizer is None:
            return []

        resume_skill_set = {s.lower() for s in resume_skills}

        tfidf_scores = cosine_similarity(
            self.vectorizer.transform([resume_text]), self.matrix
        )[0]
        bm25_scores = _normalize(np.asarray(self.bm25.get_scores(content_tokens(resume_text))))

        results: list[ScoredJob] = []
        for index, job_id in enumerate(self.job_ids):
            job_skills = self.skill_sets[index]
            matched = sorted(s for s in job_skills if s.lower() in resume_skill_set)
            missing = sorted(s for s in job_skills if s.lower() not in resume_skill_set)

            skill_score = len(matched) / len(job_skills) if job_skills else 0.0
            combined = (
                WEIGHT_SKILLS * skill_score
                + WEIGHT_TFIDF * float(tfidf_scores[index])
                + WEIGHT_BM25 * float(bm25_scores[index])
            )
            results.append(
                ScoredJob(
                    job_id=job_id,
                    score=_clamp(combined),
                    matched_skills=tuple(matched),
                    missing_skills=tuple(missing),
                )
            )

        results.sort(key=lambda r: r.score, reverse=True)
        return results


def _normalize(values: np.ndarray) -> np.ndarray:
    """Scale to [0, 1]. A flat vector maps to zeros, not NaNs."""
    if values.size == 0:
        return values
    lo, hi = float(values.min()), float(values.max())
    if math.isclose(hi, lo):
        return np.zeros_like(values)
    return (values - lo) / (hi - lo)


def _clamp(value: float) -> float:
    return max(0.0, min(1.0, value))


# --------------------------------------------------------------------------
# Corpus cache
# --------------------------------------------------------------------------

_CACHE_KEY = "matching:job-corpus-revision"
_lock = threading.Lock()
_corpus: JobCorpus | None = None
_corpus_revision: int | None = None


def _current_revision() -> int:
    from django.core.cache import cache

    revision = cache.get(_CACHE_KEY)
    if revision is None:
        revision = 1
        cache.set(_CACHE_KEY, revision, timeout=None)
    return revision


def invalidate_corpus_cache() -> None:
    """Force a rebuild on the next scoring call. Called on Job save/delete."""
    from django.core.cache import cache

    try:
        cache.incr(_CACHE_KEY)
    except ValueError:
        cache.set(_CACHE_KEY, 1, timeout=None)


def get_job_corpus(force: bool = False) -> JobCorpus:
    """Return the fitted corpus for all currently open jobs."""
    global _corpus, _corpus_revision

    from api.models import Job

    revision = _current_revision()
    with _lock:
        if force or _corpus is None or _corpus_revision != revision:
            rows = list(
                Job.objects.open().values(
                    "id", "searchable_text", "extracted_skills"
                )
            )
            _corpus = JobCorpus(
                job_ids=[r["id"] for r in rows],
                documents=[r["searchable_text"] or "" for r in rows],
                skill_sets=[r["extracted_skills"] or [] for r in rows],
            )
            _corpus_revision = revision
        return _corpus


def recommend_jobs(
    resume_text: str,
    resume_skills: list[str] | None = None,
    limit: int = 10,
    min_score: float = 0.0,
) -> list[ScoredJob]:
    """Rank open jobs against a resume.

    Unlike the previous implementation, these are real ``Job`` rows, not rows
    from a static CSV that recruiters could never post to.
    """
    if not resume_text.strip():
        return []
    skills = resume_skills if resume_skills is not None else extract_skills(resume_text)
    scored = get_job_corpus().score(resume_text, skills)
    return [s for s in scored if s.score >= min_score][:limit]


def score_pair(
    resume_text: str, job_text: str, resume_skills: list[str] | None = None
) -> ScoredJob:
    """Score a resume against one arbitrary job description.

    Used by the ATS report, where the job description is pasted in rather than
    stored, so there is no corpus to fit against.
    """
    resume_skills = (
        resume_skills if resume_skills is not None else extract_skills(resume_text)
    )
    job_skills = extract_skills(job_text)

    # A two-document corpus gives IDF little to work with, so BM25 is replaced
    # by plain token overlap below; fit the vectoriser across both texts.
    vectorizer = TfidfVectorizer(analyzer=analyzer, sublinear_tf=True)
    try:
        matrix = vectorizer.fit_transform([resume_text, job_text])
        tfidf = float(cosine_similarity(matrix[0], matrix[1])[0][0])
    except ValueError:
        tfidf = 0.0

    resume_skill_set = {s.lower() for s in resume_skills}
    matched = sorted(s for s in job_skills if s.lower() in resume_skill_set)
    missing = sorted(s for s in job_skills if s.lower() not in resume_skill_set)
    skill_score = len(matched) / len(job_skills) if job_skills else 0.0

    tokens_resume = set(content_tokens(resume_text))
    tokens_job = set(content_tokens(job_text))
    overlap = (
        len(tokens_resume & tokens_job) / len(tokens_job) if tokens_job else 0.0
    )

    combined = WEIGHT_SKILLS * skill_score + WEIGHT_TFIDF * tfidf + WEIGHT_BM25 * overlap
    return ScoredJob(
        job_id=0,
        score=_clamp(combined),
        matched_skills=tuple(matched),
        missing_skills=tuple(missing),
    )

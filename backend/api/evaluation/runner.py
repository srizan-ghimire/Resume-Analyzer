"""Evaluation runner: scores every resume against every job and measures it."""

from __future__ import annotations

from dataclasses import dataclass, field

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from ..matching.skills import extract_skills
from ..matching.text import analyzer, content_tokens
from . import metrics
from .dataset import EvaluationSet, JobSample, ResumeSample, load


@dataclass(frozen=True)
class Weights:
    """A scorer configuration, so variants can be compared head to head."""

    name: str
    skills: float
    tfidf: float
    bm25: float


# The shipped configuration, plus single-signal ablations to show what each
# component actually contributes.
CONFIGURATIONS = [
    Weights("shipped (0.45/0.35/0.20)", 0.45, 0.35, 0.20),
    Weights("skills only", 1.0, 0.0, 0.0),
    Weights("tf-idf only", 0.0, 1.0, 0.0),
    Weights("overlap only", 0.0, 0.0, 1.0),
    Weights("even thirds", 1 / 3, 1 / 3, 1 / 3),
    Weights("skills-heavy (0.70/0.20/0.10)", 0.70, 0.20, 0.10),
    Weights("text-heavy (0.20/0.55/0.25)", 0.20, 0.55, 0.25),
]


@dataclass
class RankingResult:
    resume_key: str
    resume_label: str
    ranked_job_keys: list[str]
    graded: list[int]
    ideal: list[int]
    top_job_key: str
    top_grade: int


@dataclass
class RankingReport:
    configuration: str
    ndcg_at_3: float
    ndcg_at_5: float
    precision_at_1: float
    precision_at_3: float
    recall_at_5: float
    mrr: float
    perfect_top_rate: float
    per_resume: list[RankingResult] = field(default_factory=list)


def _job_text(job: JobSample) -> str:
    return f"{job.title} {job.company} {job.description} {job.requirements}"


class _Scorer:
    """Mirrors api.matching.scorer, parameterised by weights.

    Deliberately reimplemented over an in-memory corpus rather than the Job
    table, so the evaluation needs no database and no fixtures.
    """

    def __init__(self, jobs: list[JobSample]):
        self.jobs = jobs
        self.documents = [_job_text(job) for job in jobs]
        self.job_skills = [set(extract_skills(doc)) for doc in self.documents]
        self.job_tokens = [set(content_tokens(doc)) for doc in self.documents]
        self.vectorizer = TfidfVectorizer(analyzer=analyzer, sublinear_tf=True)
        self.matrix = self.vectorizer.fit_transform(self.documents)

    def rank(self, resume_text: str, weights: Weights) -> list[tuple[str, float]]:
        resume_skills = {s.lower() for s in extract_skills(resume_text)}
        resume_tokens = set(content_tokens(resume_text))

        tfidf_scores = cosine_similarity(
            self.vectorizer.transform([resume_text]), self.matrix
        )[0]

        scored: list[tuple[str, float]] = []
        for index, job in enumerate(self.jobs):
            job_skills = self.job_skills[index]
            matched = sum(1 for s in job_skills if s.lower() in resume_skills)
            skill_score = matched / len(job_skills) if job_skills else 0.0

            job_tokens = self.job_tokens[index]
            overlap = (
                len(resume_tokens & job_tokens) / len(job_tokens) if job_tokens else 0.0
            )

            combined = (
                weights.skills * skill_score
                + weights.tfidf * float(tfidf_scores[index])
                + weights.bm25 * overlap
            )
            scored.append((job.key, combined))

        scored.sort(key=lambda pair: pair[1], reverse=True)
        return scored


def evaluate_ranking(
    data: EvaluationSet, weights: Weights, scorer: _Scorer | None = None
) -> RankingReport:
    scorer = scorer or _Scorer(data.jobs)

    ndcg3, ndcg5, p1, p3, r5, rr, perfect = [], [], [], [], [], [], []
    results: list[RankingResult] = []

    for resume in data.resumes:
        ranked = scorer.rank(resume.text, weights)
        ranked_keys = [key for key, _ in ranked]
        graded = [data.grade(resume.key, key) for key in ranked_keys]
        ideal = [data.grade(resume.key, job.key) for job in data.jobs]
        total_relevant = sum(1 for g in ideal if g >= metrics.RELEVANT_THRESHOLD)

        ndcg3.append(metrics.ndcg_at_k(graded, ideal, 3))
        ndcg5.append(metrics.ndcg_at_k(graded, ideal, 5))
        p1.append(metrics.precision_at_k(graded, 1))
        p3.append(metrics.precision_at_k(graded, 3))
        r5.append(metrics.recall_at_k(graded, total_relevant, 5))
        rr.append(metrics.reciprocal_rank(graded))
        perfect.append(metrics.top_is_best(graded, ideal))

        results.append(
            RankingResult(
                resume_key=resume.key,
                resume_label=resume.label,
                ranked_job_keys=ranked_keys,
                graded=graded,
                ideal=ideal,
                top_job_key=ranked_keys[0],
                top_grade=graded[0],
            )
        )

    return RankingReport(
        configuration=weights.name,
        ndcg_at_3=metrics.mean(ndcg3),
        ndcg_at_5=metrics.mean(ndcg5),
        precision_at_1=metrics.mean(p1),
        precision_at_3=metrics.mean(p3),
        recall_at_5=metrics.mean(r5),
        mrr=metrics.mean(rr),
        perfect_top_rate=metrics.mean(perfect),
        per_resume=results,
    )


@dataclass
class ExtractionResult:
    resume_key: str
    resume_label: str
    prf: metrics.PRF
    missed: list[str]
    spurious: list[str]


@dataclass
class ExtractionReport:
    macro_precision: float
    macro_recall: float
    macro_f1: float
    micro_precision: float
    micro_recall: float
    micro_f1: float
    per_resume: list[ExtractionResult] = field(default_factory=list)


def evaluate_extraction(data: EvaluationSet) -> ExtractionReport:
    """How well does skill extraction recover what a human says a resume claims?

    Only resumes with an annotated `expected_skills` list are scored. Note this
    measures recall of the *annotated* skills, not of everything the resume
    arguably implies.
    """
    results: list[ExtractionResult] = []
    tp = fp = fn = 0

    for resume in data.resumes:
        if not resume.expected_skills:
            continue
        predicted = set(extract_skills(resume.text))
        expected = set(resume.expected_skills)
        score = metrics.prf(predicted, expected)

        tp += score.true_positives
        fp += score.false_positives
        fn += score.false_negatives

        results.append(
            ExtractionResult(
                resume_key=resume.key,
                resume_label=resume.label,
                prf=score,
                missed=sorted(expected - predicted),
                spurious=sorted(predicted - expected),
            )
        )

    micro_p = tp / (tp + fp) if (tp + fp) else 0.0
    micro_r = tp / (tp + fn) if (tp + fn) else 0.0
    micro_f1 = (
        2 * micro_p * micro_r / (micro_p + micro_r) if (micro_p + micro_r) else 0.0
    )

    return ExtractionReport(
        macro_precision=metrics.mean([r.prf.precision for r in results]),
        macro_recall=metrics.mean([r.prf.recall for r in results]),
        macro_f1=metrics.mean([r.prf.f1 for r in results]),
        micro_precision=micro_p,
        micro_recall=micro_r,
        micro_f1=micro_f1,
        per_resume=results,
    )


def run_all(data: EvaluationSet | None = None):
    data = data or load()
    scorer = _Scorer(data.jobs)
    ranking = [evaluate_ranking(data, w, scorer) for w in CONFIGURATIONS]
    extraction = evaluate_extraction(data)
    return data, ranking, extraction


__all__ = [
    "CONFIGURATIONS",
    "ExtractionReport",
    "RankingReport",
    "ResumeSample",
    "Weights",
    "evaluate_extraction",
    "evaluate_ranking",
    "run_all",
]

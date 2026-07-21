"""Retrieval and extraction metrics.

Matching is a *ranking* problem, not a classification one, so "accuracy" in the
classifier sense does not apply. What matters is whether the right jobs appear
near the top of the list. These are the standard information-retrieval measures
for that.
"""

from __future__ import annotations

import math
from dataclasses import dataclass

# A grade at or above this counts as "relevant" for the binary measures.
RELEVANT_THRESHOLD = 2


def precision_at_k(grades: list[int], k: int) -> float:
    """Fraction of the top k results that are relevant."""
    if k <= 0:
        return 0.0
    top = grades[:k]
    if not top:
        return 0.0
    return sum(1 for g in top if g >= RELEVANT_THRESHOLD) / len(top)


def recall_at_k(grades: list[int], total_relevant: int, k: int) -> float:
    """Fraction of all relevant jobs that made the top k."""
    if total_relevant <= 0:
        return 0.0
    return sum(1 for g in grades[:k] if g >= RELEVANT_THRESHOLD) / total_relevant


def reciprocal_rank(grades: list[int]) -> float:
    """1/rank of the first relevant result; 0 if none is relevant."""
    for index, grade in enumerate(grades, start=1):
        if grade >= RELEVANT_THRESHOLD:
            return 1.0 / index
    return 0.0


def hit_at_1(grades: list[int]) -> float:
    """Did the single best-graded kind of result come first?"""
    return 1.0 if grades and grades[0] >= RELEVANT_THRESHOLD else 0.0


def top_is_best(grades: list[int], ideal: list[int]) -> float:
    """Is the first result graded as highly as anything available?"""
    if not grades or not ideal:
        return 0.0
    return 1.0 if grades[0] >= max(ideal) else 0.0


def dcg(grades: list[int], k: int) -> float:
    return sum(
        (2**grade - 1) / math.log2(index + 1)
        for index, grade in enumerate(grades[:k], start=1)
    )


def ndcg_at_k(grades: list[int], ideal_grades: list[int], k: int) -> float:
    """Normalised discounted cumulative gain.

    The headline ranking measure: rewards putting highly-graded results early,
    and is normalised against the best possible ordering, so it is comparable
    across queries with different numbers of relevant items.
    """
    ideal = dcg(sorted(ideal_grades, reverse=True), k)
    if ideal == 0:
        return 0.0
    return dcg(grades, k) / ideal


@dataclass
class PRF:
    precision: float
    recall: float
    f1: float
    true_positives: int
    false_positives: int
    false_negatives: int


def prf(predicted: set[str], expected: set[str]) -> PRF:
    """Precision / recall / F1 for set extraction."""
    tp = len(predicted & expected)
    fp = len(predicted - expected)
    fn = len(expected - predicted)
    precision = tp / (tp + fp) if (tp + fp) else 0.0
    recall = tp / (tp + fn) if (tp + fn) else 0.0
    f1 = 2 * precision * recall / (precision + recall) if (precision + recall) else 0.0
    return PRF(precision, recall, f1, tp, fp, fn)


def mean(values: list[float]) -> float:
    return sum(values) / len(values) if values else 0.0

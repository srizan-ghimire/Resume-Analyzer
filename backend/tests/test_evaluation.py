"""Quality gates on the matching engine.

Unit tests assert behaviour; these assert *quality*. Thresholds sit slightly
below current measured performance, so an accidental regression fails the build
while a genuine improvement does not.

Update the thresholds deliberately, and only upward.
"""

import csv
import re

import pytest

from api.evaluation.dataset import load
from api.evaluation.runner import (
    CONFIGURATIONS,
    evaluate_extraction,
    evaluate_ranking,
)
from api.matching.skills import SKILLS_CSV, extract_skills

# Measured 2026-07-21. See `python manage.py evaluate_matching`.
MIN_NDCG_AT_5 = 0.90
MIN_PRECISION_AT_1 = 0.90
MIN_MRR = 0.90
MIN_EXTRACTION_RECALL = 0.92
MIN_EXTRACTION_F1 = 0.85


@pytest.fixture(scope="module")
def data():
    return load()


class TestRankingQuality:
    def test_shipped_configuration_meets_thresholds(self, data):
        shipped = CONFIGURATIONS[0]
        report = evaluate_ranking(data, shipped)

        assert report.ndcg_at_5 >= MIN_NDCG_AT_5, (
            f"NDCG@5 fell to {report.ndcg_at_5:.3f}"
        )
        assert report.precision_at_1 >= MIN_PRECISION_AT_1
        assert report.mrr >= MIN_MRR

    def test_every_resume_gets_a_relevant_top_result(self, data):
        report = evaluate_ranking(data, CONFIGURATIONS[0])
        misses = [r.resume_label for r in report.per_resume if r.top_grade < 2]
        assert not misses, f"top result was irrelevant for: {misses}"

    def test_designer_does_not_rank_engineering_roles_first(self, data):
        """Cross-discipline control: the scorer must not match on generic prose."""
        report = evaluate_ranking(data, CONFIGURATIONS[0])
        designer = next(r for r in report.per_resume if r.resume_key == "designer")
        assert designer.top_job_key == "job_designer"

    def test_marketing_role_never_ranks_first_for_a_technical_resume(self, data):
        report = evaluate_ranking(data, CONFIGURATIONS[0])
        for result in report.per_resume:
            if result.resume_key == "designer":
                continue
            assert result.top_job_key != "job_marketing", (
                f"{result.resume_label} matched the marketing role"
            )

    def test_hybrid_is_no_worse_than_any_single_signal(self, data):
        """The blend must justify itself against its own components."""
        shipped = evaluate_ranking(data, CONFIGURATIONS[0]).ndcg_at_5
        singles = [
            evaluate_ranking(data, config).ndcg_at_5
            for config in CONFIGURATIONS
            if config.name in {"skills only", "tf-idf only", "overlap only"}
        ]
        assert shipped >= max(singles) - 0.01


class TestExtractionQuality:
    def test_meets_thresholds(self, data):
        report = evaluate_extraction(data)
        assert report.micro_recall >= MIN_EXTRACTION_RECALL, (
            f"recall fell to {report.micro_recall:.3f}"
        )
        assert report.micro_f1 >= MIN_EXTRACTION_F1

    def test_no_resume_is_badly_misparsed(self, data):
        report = evaluate_extraction(data)
        weak = [r.resume_label for r in report.per_resume if r.prf.recall < 0.6]
        assert not weak, f"recall under 60% for: {weak}"


class TestVocabularyHygiene:
    """Guards against the CamelCase splitter producing user-visible garbage.

    "RESTfulAPIs" was once stored as "RES Tful AP Is" and rendered that way in
    the UI as a matched skill.
    """

    @pytest.fixture(scope="class")
    def vocabulary(self):
        with SKILLS_CSV.open(encoding="utf-8", newline="") as fh:
            return [row["skill"] for row in csv.DictReader(fh)]

    def test_no_orphaned_acronym_fragments(self, vocabulary):
        # A short all-caps fragment followed by a capitalised word is the
        # signature of a bad split ("AP Igateway", "RES Tful").
        pattern = re.compile(r"\b[A-Z]{2,3}\s+[A-Z][a-z]")
        offenders = [
            skill
            for skill in vocabulary
            if pattern.search(skill) and skill not in ALLOWED_ACRONYM_PHRASES
        ]
        assert not offenders, f"mangled skill names: {offenders}"

    def test_no_single_letter_fragments(self, vocabulary):
        offenders = [
            skill
            for skill in vocabulary
            if any(len(part) == 1 and part.isalpha() for part in skill.split())
            and skill not in ALLOWED_SINGLE_LETTER
        ]
        assert not offenders, f"skill names split mid-word: {offenders}"

    def test_no_duplicate_canonical_names(self, vocabulary):
        lowered = [s.lower() for s in vocabulary]
        duplicates = {s for s in lowered if lowered.count(s) > 1}
        assert not duplicates, f"duplicate entries: {duplicates}"


# Legitimate names that trip the heuristics above.
ALLOWED_ACRONYM_PHRASES = {
    "AI Ethics",
    "AI Ops",
    "AIOps",
    "API Integration",
    "API Management",
    "API Gateway",
    "API Security",
    "AR Development",
    "BIM Coordination",
    "BBC Basic",
    "CAD Modeling",
    "CNC Programming",
    "GIS Mapping",
    "IT Audit",
    "MAXScript",
    "ML Ops",
    "MLOps",
    "PLC Programming",
    "RF Engineering",
    "SEO Optimization",
    "UI Design",
    "UI Engineering",
    "UX Design",
    "VR Development",
    "XR Development",
}

ALLOWED_SINGLE_LETTER = {
    "A/B Testing",
    "C Sharp",
    "C Plus Plus",
    "R Programming",
}


class TestKnownExtractionCases:
    """Specific spellings that previously failed."""

    @pytest.mark.parametrize(
        "text,expected",
        [
            ("Built UIs with SwiftUI", "SwiftUI"),
            ("Designed RESTful APIs", "REST API"),
            ("Strong Excel skills", "Excel"),
            ("Shipped an iOS app", "iOS"),
            ("Async tasks on Celery", "Celery"),
            ("Comfortable with public speaking", "Public Speaking"),
            ("Deployed on AWS", "Amazon Web Services"),
            ("Wrote C++ and C# services", "C++"),
            ("Used Node.js in production", "Node.js"),
        ],
    )
    def test_extracts(self, text, expected):
        assert expected in extract_skills(text)

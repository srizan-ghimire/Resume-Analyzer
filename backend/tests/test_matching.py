"""Matching engine tests.

These are the tests that matter most: the scorer is the product, and its
failures are silent -- a bad ranking still returns 200 OK.
"""

import pytest

from api.matching.ats import build_ats_report
from api.matching.parser import DocumentParseError, analyze, parse_document
from api.matching.scorer import recommend_jobs, score_pair
from api.matching.skills import (
    extract_education,
    extract_required_years,
    extract_skills,
    skill_vocabulary_size,
)
from api.matching.text import content_tokens, tokenize

from .conftest import (
    DATA_SCIENCE_JD,
    FRONTEND_JD,
    FRONTEND_RESUME_TEXT,
    SEEKER_RESUME_TEXT,
    make_pdf,
)


class TestTokenizer:
    @pytest.mark.parametrize(
        "text,expected",
        [
            ("I use C++ daily", "c++"),
            ("Built with Node.js", "node.js"),
            ("Shipped C# services", "c#"),
            ("Ran CI/CD pipelines", "ci/cd"),
        ],
    )
    def test_preserves_technology_spellings(self, text, expected):
        assert expected in [t.lower() for t in tokenize(text)]

    def test_drops_stopwords(self):
        tokens = content_tokens("the candidate will have experience with Python")
        assert "python" in tokens
        assert "the" not in tokens
        assert "experience" not in tokens


class TestSkillExtraction:
    def test_vocabulary_loaded(self):
        assert skill_vocabulary_size() > 1000

    def test_finds_core_skills(self):
        skills = extract_skills(SEEKER_RESUME_TEXT)
        for expected in ["Python", "SQL", "Docker", "Pandas", "NumPy"]:
            assert expected in skills

    def test_multiword_skills_match_natural_phrasing(self):
        """The old CamelCase vocabulary could never match real prose."""
        assert "Machine Learning" in extract_skills("Strong machine learning background")
        assert "Public Speaking" in extract_skills("Comfortable with public speaking")

    def test_aliases_resolve_to_canonical_name(self):
        assert "React" in extract_skills("Built UIs in ReactJS")
        assert "Amazon Web Services" in extract_skills("Deployed on AWS")
        assert "PostgreSQL" in extract_skills("Data lives in Postgres")

    def test_longest_match_wins(self):
        skills = extract_skills("Experienced in machine learning")
        assert "Machine Learning" in skills

    def test_no_duplicates(self):
        skills = extract_skills("Python Python python PYTHON")
        assert skills.count("Python") == 1

    def test_empty_input(self):
        assert extract_skills("") == []
        assert extract_skills("   ") == []

    def test_education_extraction(self):
        education = extract_education(SEEKER_RESUME_TEXT)
        assert "Master of Science in Computer Science" in education

    def test_education_ignores_bare_skill_terms(self):
        """"Machine Learning" is a skill, not an education entry."""
        assert extract_education("Skills: Machine Learning, Statistics") == []

    @pytest.mark.parametrize(
        "text,expected",
        [
            ("5 years of experience", 5),
            ("3+ years in the field", 3),
            ("We need 2 to 4 years", 2),
            ("No stated requirement", None),
            ("Founded in 2015 years ago", None),
        ],
    )
    def test_required_years(self, text, expected):
        assert extract_required_years(text) == expected


class TestParser:
    def test_parses_generated_pdf(self):
        document = parse_document(make_pdf(SEEKER_RESUME_TEXT))
        assert "Jane Doe" in document.text
        assert document.page_count == 1
        assert document.word_count > 50

    def test_rejects_unknown_format(self):
        with pytest.raises(DocumentParseError):
            parse_document(b"just some plain text, not a document")

    def test_rejects_empty_pdf_text(self):
        with pytest.raises(DocumentParseError):
            parse_document(make_pdf(""))

    def test_detects_contact_details(self):
        doc = analyze(SEEKER_RESUME_TEXT)
        assert "jane.doe@example.com" in doc.emails
        assert doc.phones
        assert doc.has_linkedin

    def test_detects_sections(self):
        doc = analyze(SEEKER_RESUME_TEXT)
        assert {"experience", "education", "skills"} <= set(doc.sections)

    def test_counts_bullets_and_action_verbs(self):
        doc = analyze(SEEKER_RESUME_TEXT)
        assert doc.bullet_count >= 5
        assert doc.action_verb_count >= 5

    def test_collects_years(self):
        doc = analyze(SEEKER_RESUME_TEXT)
        assert 2016 in doc.years_mentioned
        assert 2024 in doc.years_mentioned


class TestScorePair:
    def test_matching_resume_beats_mismatched_one(self):
        aligned = score_pair(SEEKER_RESUME_TEXT, DATA_SCIENCE_JD)
        unrelated = score_pair(FRONTEND_RESUME_TEXT, DATA_SCIENCE_JD)
        assert aligned.score > unrelated.score

    def test_reports_matched_and_missing_skills(self):
        result = score_pair(FRONTEND_RESUME_TEXT, FRONTEND_JD)
        assert "React" in result.matched_skills
        assert "React" not in result.missing_skills

    def test_score_is_bounded(self):
        for resume, jd in [
            (SEEKER_RESUME_TEXT, DATA_SCIENCE_JD),
            (FRONTEND_RESUME_TEXT, DATA_SCIENCE_JD),
            ("", DATA_SCIENCE_JD),
        ]:
            assert 0.0 <= score_pair(resume, jd).score <= 1.0

    def test_identical_text_scores_highly(self):
        assert score_pair(DATA_SCIENCE_JD, DATA_SCIENCE_JD).score > 0.7


@pytest.mark.django_db
class TestRecommendations:
    def test_ranks_relevant_job_first(self, ds_job, frontend_job):
        results = recommend_jobs(SEEKER_RESUME_TEXT)
        assert results
        assert results[0].job_id == ds_job.id

    def test_ranking_follows_the_resume(self, ds_job, frontend_job):
        """A frontend resume must invert the ordering."""
        results = recommend_jobs(FRONTEND_RESUME_TEXT)
        assert results[0].job_id == frontend_job.id

    def test_excludes_expired_jobs(self, ds_job, expired_job):
        job_ids = {r.job_id for r in recommend_jobs(SEEKER_RESUME_TEXT)}
        assert ds_job.id in job_ids
        assert expired_job.id not in job_ids

    def test_excludes_inactive_jobs(self, ds_job, frontend_job):
        frontend_job.is_active = False
        frontend_job.save()
        assert frontend_job.id not in {r.job_id for r in recommend_jobs(FRONTEND_RESUME_TEXT)}

    def test_respects_limit(self, ds_job, frontend_job):
        assert len(recommend_jobs(SEEKER_RESUME_TEXT, limit=1)) == 1

    def test_empty_resume_returns_nothing(self, ds_job):
        assert recommend_jobs("") == []

    def test_no_open_jobs_returns_nothing(self, db):
        assert recommend_jobs(SEEKER_RESUME_TEXT) == []

    def test_cache_invalidates_when_a_job_is_added(self, ds_job):
        from api.models import Job

        before = len(recommend_jobs(SEEKER_RESUME_TEXT, limit=50))
        Job.objects.create(
            recruiter=ds_job.recruiter,
            job_title="ML Engineer",
            company_name="New Co",
            location="Remote",
            job_description="Python machine learning pipelines with Docker.",
        )
        assert len(recommend_jobs(SEEKER_RESUME_TEXT, limit=50)) == before + 1


class TestAtsReport:
    def test_aligned_resume_scores_higher(self):
        good = build_ats_report(SEEKER_RESUME_TEXT, DATA_SCIENCE_JD)
        poor = build_ats_report(FRONTEND_RESUME_TEXT, DATA_SCIENCE_JD)
        assert good.score > poor.score

    def test_report_shape(self):
        report = build_ats_report(SEEKER_RESUME_TEXT, DATA_SCIENCE_JD)
        assert 0 <= report.score <= 100
        assert 0 <= report.keyword_score <= 100
        assert 0 <= report.quality_score <= 100
        assert report.verdict
        assert report.checks
        assert report.suggestions
        assert report.word_count > 0

    def test_missing_skills_ranked_by_importance(self):
        report = build_ats_report(FRONTEND_RESUME_TEXT, DATA_SCIENCE_JD)
        assert report.missing_skills
        importances = [gap.importance for gap in report.missing_skills]
        assert importances == sorted(importances, reverse=True)
        assert all(0.0 <= i <= 1.0 for i in importances)

    def test_matched_and_missing_are_disjoint(self):
        report = build_ats_report(SEEKER_RESUME_TEXT, DATA_SCIENCE_JD)
        missing = {gap.skill for gap in report.missing_skills}
        assert not (set(report.matched_skills) & missing)

    def test_flags_missing_contact_details(self):
        report = build_ats_report("Python developer with SQL skills.", DATA_SCIENCE_JD)
        email_check = next(c for c in report.checks if c.id == "contact_email")
        assert not email_check.passed
        assert email_check.severity == "critical"

    def test_passes_contact_details_when_present(self):
        report = build_ats_report(SEEKER_RESUME_TEXT, DATA_SCIENCE_JD)
        assert next(c for c in report.checks if c.id == "contact_email").passed

    def test_flags_short_resume(self):
        report = build_ats_report("Python. SQL.", DATA_SCIENCE_JD)
        assert not next(c for c in report.checks if c.id == "length").passed

    def test_detects_required_years(self):
        assert build_ats_report(SEEKER_RESUME_TEXT, DATA_SCIENCE_JD).required_years == 5

    def test_score_improves_when_gaps_are_closed(self):
        """The core promise of the report: acting on it must help."""
        base = build_ats_report(FRONTEND_RESUME_TEXT, DATA_SCIENCE_JD)
        added = " ".join(gap.skill for gap in base.missing_skills)
        improved = build_ats_report(
            FRONTEND_RESUME_TEXT + f"\nADDITIONAL SKILLS\n{added}\n", DATA_SCIENCE_JD
        )
        assert improved.score > base.score

    def test_failed_checks_sort_first(self):
        report = build_ats_report("Python and SQL.", DATA_SCIENCE_JD)
        passed_flags = [c.passed for c in report.checks]
        assert passed_flags == sorted(passed_flags)

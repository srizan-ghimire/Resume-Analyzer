"""ATS report generation.

The previous endpoint returned a bare cosine float. This produces the thing a
job seeker can act on: a score, which required skills are missing and how much
each one matters, and the format checks that real applicant tracking systems
reject resumes on.
"""

from __future__ import annotations

from dataclasses import asdict, dataclass, field

from sklearn.feature_extraction.text import TfidfVectorizer

from .parser import ParsedDocument, analyze
from .scorer import score_pair
from .skills import extract_education, extract_required_years, extract_skills
from .text import analyzer, content_tokens

# Resume length bounds, in words. Below the floor there is nothing to assess;
# above the ceiling, recruiters stop reading.
MIN_WORDS = 200
MAX_WORDS = 1200

SEVERITY_ORDER = {"critical": 0, "warning": 1, "info": 2}


@dataclass
class SkillGap:
    skill: str
    importance: float  # 0-1, from the skill's TF-IDF weight in the job description


@dataclass
class Check:
    id: str
    label: str
    passed: bool
    severity: str  # "critical" | "warning" | "info"
    detail: str


@dataclass
class AtsReport:
    score: int
    verdict: str
    keyword_score: int
    quality_score: int
    matched_skills: list[str] = field(default_factory=list)
    missing_skills: list[SkillGap] = field(default_factory=list)
    matched_education: list[str] = field(default_factory=list)
    required_years: int | None = None
    keyword_density: float = 0.0
    word_count: int = 0
    checks: list[Check] = field(default_factory=list)
    suggestions: list[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        return asdict(self)


def _verdict(score: int) -> str:
    if score >= 80:
        return "Strong match"
    if score >= 60:
        return "Good match"
    if score >= 40:
        return "Partial match"
    return "Weak match"


def _skill_importance(job_description: str, skills: list[str]) -> dict[str, float]:
    """Weight each required skill by how central it is to the job description.

    A skill named in the headline requirements should outrank one mentioned once
    in a "nice to have" aside. TF-IDF weight over the description's own terms is
    a reasonable proxy.
    """
    if not skills:
        return {}
    try:
        vectorizer = TfidfVectorizer(analyzer=analyzer, sublinear_tf=True)
        matrix = vectorizer.fit_transform([job_description])
    except ValueError:
        return {s: 0.5 for s in skills}

    vocabulary = vectorizer.vocabulary_
    row = matrix.toarray()[0]

    raw: dict[str, float] = {}
    for skill in skills:
        key = skill.lower()
        weight = 0.0
        if key in vocabulary:
            weight = float(row[vocabulary[key]])
        else:
            # Multi-word skills may only appear as their component terms.
            parts = [row[vocabulary[t]] for t in key.split() if t in vocabulary]
            weight = float(sum(parts) / len(parts)) if parts else 0.0
        raw[skill] = weight

    peak = max(raw.values(), default=0.0)
    if peak <= 0:
        return {s: 0.5 for s in skills}
    return {s: round(min(1.0, w / peak), 3) for s, w in raw.items()}


def _quality_checks(doc: ParsedDocument, skills: list[str]) -> list[Check]:
    """Format and structure checks, in the spirit of what real ATS parsers do."""
    checks: list[Check] = []

    checks.append(
        Check(
            id="contact_email",
            label="Contact email present",
            passed=bool(doc.emails),
            severity="critical",
            detail=(
                f"Found {doc.emails[0]}."
                if doc.emails
                else "No email address found. Most ATS systems key candidate "
                "records on email; without one your application may be dropped."
            ),
        )
    )
    checks.append(
        Check(
            id="contact_phone",
            label="Phone number present",
            passed=bool(doc.phones),
            severity="warning",
            detail="Found a phone number." if doc.phones else "No phone number found.",
        )
    )
    checks.append(
        Check(
            id="linkedin",
            label="LinkedIn profile linked",
            passed=doc.has_linkedin,
            severity="info",
            detail=(
                "LinkedIn profile found."
                if doc.has_linkedin
                else "Adding a LinkedIn URL gives recruiters an easy next step."
            ),
        )
    )

    required_sections = {"experience", "education", "skills"}
    present = set(doc.sections)
    missing_sections = sorted(required_sections - present)
    checks.append(
        Check(
            id="sections",
            label="Standard sections detected",
            passed=not missing_sections,
            severity="critical",
            detail=(
                f"Detected: {', '.join(sorted(present)) or 'none'}."
                if not missing_sections
                else "Missing clearly-headed sections: "
                f"{', '.join(missing_sections)}. ATS parsers split resumes on "
                "these headings; without them your content may be misfiled."
            ),
        )
    )

    if doc.word_count < MIN_WORDS:
        length_detail = (
            f"{doc.word_count} words is very short. Aim for {MIN_WORDS}-{MAX_WORDS} "
            "words so there is enough substance to match against."
        )
    elif doc.word_count > MAX_WORDS:
        length_detail = (
            f"{doc.word_count} words is long. Trim toward {MAX_WORDS} words; "
            "reviewers rarely read past two pages."
        )
    else:
        length_detail = f"{doc.word_count} words is a good length."
    checks.append(
        Check(
            id="length",
            label="Resume length",
            passed=MIN_WORDS <= doc.word_count <= MAX_WORDS,
            severity="warning",
            detail=length_detail,
        )
    )

    checks.append(
        Check(
            id="bullets",
            label="Bullet points used",
            passed=doc.bullet_count >= 5,
            severity="warning",
            detail=(
                f"Found {doc.bullet_count} bullet points."
                if doc.bullet_count >= 5
                else f"Only {doc.bullet_count} bullet points found. Bullets parse "
                "more reliably than dense paragraphs and are easier to skim."
            ),
        )
    )
    checks.append(
        Check(
            id="action_verbs",
            label="Strong action verbs",
            passed=doc.action_verb_count >= 5,
            severity="warning",
            detail=(
                f"Uses {doc.action_verb_count} distinct action verbs."
                if doc.action_verb_count >= 5
                else f"Only {doc.action_verb_count} action verbs found. Lead bullets "
                "with verbs like 'built', 'led', 'reduced' rather than "
                "'responsible for'."
            ),
        )
    )
    checks.append(
        Check(
            id="dates",
            label="Dates present and plausible",
            passed=len(doc.years_mentioned) >= 2,
            severity="warning",
            detail=(
                f"Covers {doc.years_mentioned[0]}-{doc.years_mentioned[-1]}."
                if len(doc.years_mentioned) >= 2
                else "Few or no dates found. Add start and end years to each role "
                "so your experience can be measured."
            ),
        )
    )
    checks.append(
        Check(
            id="skills_found",
            label="Recognisable skills listed",
            passed=len(skills) >= 5,
            severity="critical",
            detail=(
                f"Identified {len(skills)} skills."
                if len(skills) >= 5
                else f"Only {len(skills)} recognisable skills found. List your tools "
                "and technologies explicitly in a Skills section."
            ),
        )
    )
    checks.append(
        Check(
            id="pages",
            label="Page count",
            passed=doc.page_count <= 2 if doc.page_count else True,
            severity="info",
            detail=(
                f"{doc.page_count} page(s)."
                if doc.page_count
                else "Page count unavailable for this format."
            ),
        )
    )

    checks.sort(key=lambda c: (c.passed, SEVERITY_ORDER.get(c.severity, 3)))
    return checks


def _quality_score(checks: list[Check]) -> int:
    """Weighted pass rate. Critical checks count for more than informational ones."""
    weights = {"critical": 3.0, "warning": 1.5, "info": 0.5}
    total = sum(weights.get(c.severity, 1.0) for c in checks)
    earned = sum(weights.get(c.severity, 1.0) for c in checks if c.passed)
    return round(100 * earned / total) if total else 0


def _suggestions(
    missing: list[SkillGap], checks: list[Check], required_years: int | None
) -> list[str]:
    out: list[str] = []

    top = [g for g in missing if g.importance >= 0.5][:5]
    if top:
        names = ", ".join(g.skill for g in top)
        out.append(
            f"Add evidence for the highest-weighted missing requirements: {names}. "
            "Name each one in a bullet describing what you built with it."
        )
    elif missing:
        names = ", ".join(g.skill for g in missing[:5])
        out.append(f"Consider mentioning these secondary requirements: {names}.")

    for check in checks:
        if not check.passed and check.severity in {"critical", "warning"}:
            out.append(check.detail)

    if required_years:
        out.append(
            f"This role asks for around {required_years} years of experience. "
            "Make your total years obvious near the top of the resume."
        )

    if not out:
        out.append(
            "No blocking issues found. Mirror the job description's exact wording "
            "for your strongest skills to maximise keyword matching."
        )
    return out[:8]


def build_ats_report(resume_text: str, job_description: str) -> AtsReport:
    """Score a resume against a job description and explain the result."""
    doc = analyze(resume_text)
    resume_skills = extract_skills(resume_text)

    pair = score_pair(resume_text, job_description, resume_skills)
    importance = _skill_importance(job_description, list(pair.missing_skills))

    gaps = sorted(
        (SkillGap(skill=s, importance=importance.get(s, 0.5)) for s in pair.missing_skills),
        key=lambda g: g.importance,
        reverse=True,
    )

    checks = _quality_checks(doc, resume_skills)
    quality = _quality_score(checks)
    keyword = pair.percentage

    # Keyword relevance dominates, but a resume an ATS cannot parse is not a
    # strong application no matter how well the keywords line up.
    overall = round(0.7 * keyword + 0.3 * quality)

    job_tokens = set(content_tokens(job_description))
    resume_tokens = content_tokens(resume_text)
    density = (
        round(100 * sum(1 for t in resume_tokens if t in job_tokens) / len(resume_tokens), 1)
        if resume_tokens
        else 0.0
    )

    return AtsReport(
        score=overall,
        verdict=_verdict(overall),
        keyword_score=keyword,
        quality_score=quality,
        matched_skills=list(pair.matched_skills),
        missing_skills=gaps,
        matched_education=extract_education(resume_text),
        required_years=extract_required_years(job_description),
        keyword_density=density,
        word_count=doc.word_count,
        checks=checks,
        suggestions=_suggestions(gaps, checks, extract_required_years(job_description)),
    )

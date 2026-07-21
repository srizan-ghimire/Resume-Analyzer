"""Shared fixtures.

The PDF fixtures are generated in-process rather than committed as binaries, so
the parser is exercised against a real PDF byte stream without a binary blob in
git.
"""

from __future__ import annotations

import io
import zlib

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from django.utils import timezone
from rest_framework.test import APIClient

from api.models import Application, CustomUser, Job, RecruiterProfile, Resume, Role

SEEKER_RESUME_TEXT = """Jane Doe
jane.doe@example.com | +1 415 555 0134 | linkedin.com/in/janedoe

SUMMARY
Senior data scientist with eight years building production machine learning
systems for search and recommendations.

SKILLS
Python, Pandas, NumPy, scikit-learn, TensorFlow, SQL, PostgreSQL, Docker,
Kubernetes, Apache Spark, Statistics, Deep Learning

EXPERIENCE
Senior Data Scientist, Acme Analytics, 2019 - 2024
- Built and shipped a ranking model that increased click-through by 18 percent
- Led a team of four engineers and mentored two junior analysts
- Reduced model training time by 60 percent by migrating pipelines to Spark
- Designed an A/B testing framework adopted across three product teams
- Automated feature engineering, eliminating twelve hours of manual work weekly

Data Analyst, Beta Insights, 2016 - 2019
- Developed dashboards in Tableau used by the executive team
- Optimized SQL queries and improved report generation speed
- Delivered forecasting models for quarterly revenue planning

EDUCATION
Master of Science in Computer Science, State University, 2016
Bachelor of Science, State University, 2014
"""

FRONTEND_RESUME_TEXT = """Sam Rivera
sam@example.com | linkedin.com/in/samrivera

SKILLS
React, TypeScript, JavaScript, HTML, CSS, Tailwind CSS, Next.js, Redux, Figma

EXPERIENCE
Frontend Engineer, Pixel Co, 2020 - 2024
- Built accessible component libraries used across five products
- Improved Lighthouse performance scores from 62 to 95
- Shipped a design system adopted by twenty engineers

EDUCATION
Bachelor of Science in Computer Science, 2020
"""

DATA_SCIENCE_JD = """
We are hiring a Senior Data Scientist. You will build predictive models and
production machine learning pipelines.

Requirements:
- 5 years of experience with Python and Machine Learning
- Strong SQL and Statistics background
- Experience with Pandas, NumPy and scikit-learn
- Familiarity with Apache Spark and Docker
- Master of Science preferred
"""

FRONTEND_JD = """
Frontend Engineer wanted. Build delightful user interfaces.

Requirements:
- 3 years of React and TypeScript
- Strong CSS and Tailwind CSS skills
- Experience with Next.js and Redux
- An eye for Accessibility
"""


def make_pdf(text: str) -> bytes:
    """Build a minimal but genuinely valid PDF containing ``text``."""
    lines = [line for line in text.splitlines() if line.strip()]

    content = ["BT", "/F1 10 Tf", "12 TL", "40 780 Td"]
    for line in lines:
        escaped = line.replace("\\", r"\\").replace("(", r"\(").replace(")", r"\)")
        content.append(f"({escaped}) Tj")
        content.append("T*")
    content.append("ET")
    stream = "\n".join(content).encode("latin-1", "replace")
    compressed = zlib.compress(stream)

    objects = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] "
        b"/Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
        b"<< /Length %d /Filter /FlateDecode >>\nstream\n%s\nendstream"
        % (len(compressed), compressed),
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    ]

    out = io.BytesIO()
    out.write(b"%PDF-1.4\n")
    offsets = []
    for index, body in enumerate(objects, start=1):
        offsets.append(out.tell())
        out.write(b"%d 0 obj\n" % index)
        out.write(body)
        out.write(b"\nendobj\n")

    xref_at = out.tell()
    out.write(b"xref\n0 %d\n" % (len(objects) + 1))
    out.write(b"0000000000 65535 f \n")
    for offset in offsets:
        out.write(b"%010d 00000 n \n" % offset)
    out.write(b"trailer\n<< /Size %d /Root 1 0 R >>\n" % (len(objects) + 1))
    out.write(b"startxref\n%d\n%%%%EOF\n" % xref_at)
    return out.getvalue()


@pytest.fixture
def api() -> APIClient:
    return APIClient()


@pytest.fixture
def seeker(db) -> CustomUser:
    user = CustomUser.objects.create_user(
        username="seeker", email="seeker@example.com", password="Str0ng-Passw0rd!"
    )
    user.role = Role.SEEKER
    user.save()
    return user


@pytest.fixture
def other_seeker(db) -> CustomUser:
    user = CustomUser.objects.create_user(
        username="seeker2", email="seeker2@example.com", password="Str0ng-Passw0rd!"
    )
    user.role = Role.SEEKER
    user.save()
    return user


@pytest.fixture
def recruiter(db) -> CustomUser:
    user = CustomUser.objects.create_user(
        username="recruiter", email="recruiter@example.com", password="Str0ng-Passw0rd!"
    )
    user.role = Role.RECRUITER
    user.save()
    RecruiterProfile.objects.create(user=user, company_name="Acme Analytics")
    return user


@pytest.fixture
def other_recruiter(db) -> CustomUser:
    user = CustomUser.objects.create_user(
        username="recruiter2", email="recruiter2@example.com", password="Str0ng-Passw0rd!"
    )
    user.role = Role.RECRUITER
    user.save()
    RecruiterProfile.objects.create(user=user, company_name="Rival Corp")
    return user


def authenticate(client: APIClient, user: CustomUser) -> APIClient:
    from rest_framework_simplejwt.tokens import RefreshToken

    token = RefreshToken.for_user(user).access_token
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
    return client


@pytest.fixture
def seeker_client(api, seeker) -> APIClient:
    return authenticate(api, seeker)


@pytest.fixture
def recruiter_client(api, recruiter) -> APIClient:
    return authenticate(api, recruiter)


@pytest.fixture
def ds_job(db, recruiter) -> Job:
    return Job.objects.create(
        recruiter=recruiter,
        job_title="Senior Data Scientist",
        company_name="Acme Analytics",
        location="Remote",
        is_remote=True,
        job_type=Job.JobType.FULL_TIME,
        salary_min=120000,
        salary_max=160000,
        job_description=DATA_SCIENCE_JD,
        job_requirements="Python Machine Learning SQL Statistics Pandas NumPy",
        expiry_time=timezone.now() + timezone.timedelta(days=30),
    )


@pytest.fixture
def frontend_job(db, recruiter) -> Job:
    return Job.objects.create(
        recruiter=recruiter,
        job_title="Frontend Engineer",
        company_name="Pixel Co",
        location="Berlin",
        job_type=Job.JobType.FULL_TIME,
        job_description=FRONTEND_JD,
        job_requirements="React TypeScript CSS Tailwind CSS Next.js Redux",
        expiry_time=timezone.now() + timezone.timedelta(days=30),
    )


@pytest.fixture
def expired_job(db, recruiter) -> Job:
    job = Job.objects.create(
        recruiter=recruiter,
        job_title="Expired Role",
        company_name="Old Corp",
        location="Nowhere",
        job_description="This posting has closed.",
        expiry_time=timezone.now() + timezone.timedelta(days=1),
    )
    # Bypass validation to place expiry in the past.
    Job.objects.filter(pk=job.pk).update(
        expiry_time=timezone.now() - timezone.timedelta(days=1)
    )
    job.refresh_from_db()
    return job


@pytest.fixture
def resume_pdf() -> bytes:
    return make_pdf(SEEKER_RESUME_TEXT)


@pytest.fixture
def resume_upload(resume_pdf) -> SimpleUploadedFile:
    return SimpleUploadedFile("jane_doe.pdf", resume_pdf, content_type="application/pdf")


@pytest.fixture
def seeker_resume(db, seeker) -> Resume:
    from api.matching.skills import extract_education, extract_skills

    return Resume.objects.create(
        user=seeker,
        file=SimpleUploadedFile("jane.pdf", make_pdf(SEEKER_RESUME_TEXT)),
        original_filename="jane.pdf",
        size_bytes=1024,
        parsed_text=SEEKER_RESUME_TEXT,
        extracted_skills=extract_skills(SEEKER_RESUME_TEXT),
        extracted_education=extract_education(SEEKER_RESUME_TEXT),
        parsed_at=timezone.now(),
        is_primary=True,
    )


@pytest.fixture
def application(db, seeker, ds_job, seeker_resume) -> Application:
    return Application.objects.create(user=seeker, job=ds_job, resume=seeker_resume)

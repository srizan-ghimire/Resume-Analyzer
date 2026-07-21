"""Hand-labelled evaluation data.

READ THIS BEFORE QUOTING ANY NUMBER FROM THE EVALUATION.

The relevance labels below were authored by hand, not collected from real
hiring outcomes. That has two consequences:

1. The numbers measure whether the engine agrees with *this* judgement of what
   a good match is. They are meaningful for comparing two versions of the
   scorer against each other, and for catching regressions.
2. They are NOT evidence of real-world accuracy. Only relevance judgements from
   actual recruiters, or downstream signals (interview / hire rates), can
   support a claim like "N% accurate in production".

Grades follow the usual graded-relevance convention:

    3  Strong match   -- would shortlist; core skills and level line up
    2  Good match     -- worth reading; most core skills present
    1  Marginal       -- adjacent field or wrong level; probably a no
    0  Irrelevant     -- different discipline

Resumes are written to read like real ones: varied section headings, some
noise, differing lengths, and a couple of deliberately awkward cases.
"""

from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(frozen=True)
class ResumeSample:
    key: str
    label: str
    text: str
    # Skills a careful human would say this resume claims. Used to score
    # extraction precision/recall. Names must match the canonical vocabulary.
    expected_skills: tuple[str, ...] = ()


@dataclass(frozen=True)
class JobSample:
    key: str
    title: str
    company: str
    description: str
    requirements: str = ""


@dataclass
class EvaluationSet:
    resumes: list[ResumeSample] = field(default_factory=list)
    jobs: list[JobSample] = field(default_factory=list)
    # (resume_key, job_key) -> grade 0..3. Missing pairs are treated as 0.
    relevance: dict[tuple[str, str], int] = field(default_factory=dict)

    def grade(self, resume_key: str, job_key: str) -> int:
        return self.relevance.get((resume_key, job_key), 0)


# ---------------------------------------------------------------------------
# Resumes
# ---------------------------------------------------------------------------

RESUMES: list[ResumeSample] = [
    ResumeSample(
        key="ds_senior",
        label="Senior data scientist, 8 yrs",
        expected_skills=(
            "Python", "SQL", "Machine Learning", "Pandas", "NumPy",
            "scikit-learn", "TensorFlow", "Apache Spark", "Docker",
            "Statistics", "Tableau", "PostgreSQL",
        ),
        text="""
Priya Raman
priya.raman@example.com | +1 415 555 0134 | linkedin.com/in/priyaraman

SUMMARY
Senior data scientist with eight years building production machine learning
systems for search ranking and demand forecasting.

TECHNICAL SKILLS
Python, SQL, PostgreSQL, Pandas, NumPy, scikit-learn, TensorFlow,
Apache Spark, Docker, Tableau, Statistics

EXPERIENCE
Senior Data Scientist, Northwind Analytics, 2019 - 2024
- Built a learning-to-rank model that increased click-through rate by 18%
- Led a team of four and mentored two junior analysts
- Reduced model training time 60% by migrating pipelines to Apache Spark
- Designed the A/B testing framework now used by three product teams
- Automated feature engineering, removing twelve hours of manual work weekly

Data Scientist, Beacon Retail, 2016 - 2019
- Delivered demand forecasting models for quarterly inventory planning
- Built executive dashboards in Tableau
- Optimised SQL queries, cutting report generation from 40 to 6 minutes

EDUCATION
Master of Science in Computer Science, State University, 2016
Bachelor of Science, State University, 2014
""",
    ),
    ResumeSample(
        key="ds_junior",
        label="Junior data analyst, 1 yr",
        expected_skills=("Python", "SQL", "Excel", "Tableau", "Statistics", "Pandas"),
        text="""
Tom Whitfield
tom.whitfield@example.com | linkedin.com/in/tomwhitfield

OBJECTIVE
Analytical graduate seeking a first full-time data role.

SKILLS
SQL, Python, Pandas, Excel, Tableau, Statistics

EXPERIENCE
Data Analyst Intern, Civic Insights, 2023 - 2024
- Produced weekly reporting on programme participation
- Cleaned and joined datasets in SQL for the research team
- Built three Tableau dashboards used by programme managers

Teaching Assistant, State University, 2022 - 2023
- Supported an introductory statistics course of 120 students

EDUCATION
Bachelor of Science in Statistics, State University, 2023
""",
    ),
    ResumeSample(
        key="ml_engineer",
        label="ML engineer, 5 yrs, infra-leaning",
        expected_skills=(
            "Python", "PyTorch", "TensorFlow", "Kubernetes", "Docker",
            "Amazon Web Services", "Machine Learning", "Apache Airflow",
            "Terraform", "CI/CD",
        ),
        text="""
Dmitri Volkov
d.volkov@example.com | linkedin.com/in/dvolkov

PROFILE
Machine learning engineer focused on getting models into production and
keeping them there.

SKILLS
Python, PyTorch, TensorFlow, Kubernetes, Docker, Amazon Web Services,
Apache Airflow, Terraform, CI/CD, Machine Learning

EXPERIENCE
Machine Learning Engineer, Vector Systems, 2021 - 2024
- Deployed 14 models to production on Kubernetes with zero-downtime rollouts
- Built the feature store and Airflow orchestration used by the whole DS team
- Cut inference cost 40% by rewriting serving in a batched async design
- Introduced CI/CD for model artefacts, replacing manual promotion

Software Engineer, Vector Systems, 2019 - 2021
- Built internal tooling in Python and Terraform

EDUCATION
Bachelor of Engineering, Technical University, 2019
""",
    ),
    ResumeSample(
        key="frontend",
        label="Frontend engineer, 4 yrs",
        expected_skills=(
            "React", "TypeScript", "JavaScript", "HTML", "CSS",
            "Tailwind CSS", "Next.js", "Redux", "Figma", "Accessibility",
            "Jest",
        ),
        text="""
Sam Rivera
sam.rivera@example.com | linkedin.com/in/samrivera

SKILLS
React, TypeScript, JavaScript, HTML, CSS, Tailwind CSS, Next.js, Redux,
Figma, Accessibility, Jest

EXPERIENCE
Frontend Engineer, Pixelworks, 2020 - 2024
- Built the accessible component library used across five products
- Raised Lighthouse performance from 62 to 95 on the main funnel
- Shipped a design system adopted by twenty engineers
- Led the migration from JavaScript to TypeScript across 80k lines

Junior Developer, Studio Nine, 2019 - 2020
- Built marketing sites in React and Next.js

EDUCATION
Bachelor of Science in Computer Science, City University, 2019
""",
    ),
    ResumeSample(
        key="backend",
        label="Backend engineer, 6 yrs, Python/Django",
        expected_skills=(
            "Python", "Django", "PostgreSQL", "Redis", "Docker", "REST API",
            "Celery", "Amazon Web Services", "Unit Testing", "Git",
        ),
        text="""
Aisha Bello
aisha.bello@example.com | linkedin.com/in/aishabello

SUMMARY
Backend engineer specialising in Python services and relational data models.

SKILLS
Python, Django, PostgreSQL, Redis, Celery, Docker, REST API,
Amazon Web Services, Unit Testing, Git

EXPERIENCE
Senior Backend Engineer, Ledgerly, 2020 - 2024
- Designed and shipped the billing service handling 2M requests per day
- Cut p99 latency from 850ms to 120ms through query and cache work
- Built the async task pipeline on Celery and Redis
- Raised backend test coverage from 34% to 86%

Backend Engineer, Ledgerly, 2018 - 2020
- Built REST APIs in Django for the mobile client

EDUCATION
Bachelor of Science in Computer Science, National University, 2018
""",
    ),
    ResumeSample(
        key="devops",
        label="DevOps / platform engineer, 7 yrs",
        expected_skills=(
            "Kubernetes", "Terraform", "Docker", "Amazon Web Services",
            "CI/CD", "Jenkins", "Prometheus", "Grafana", "Linux", "Ansible",
            "Bash", "Python",
        ),
        text="""
Marcus Feld
marcus.feld@example.com | linkedin.com/in/marcusfeld

SKILLS
Kubernetes, Terraform, Docker, Amazon Web Services, CI/CD, Jenkins,
Prometheus, Grafana, Linux, Ansible, Bash, Python

EXPERIENCE
Platform Engineer, Corvus Cloud, 2019 - 2024
- Ran the Kubernetes estate across three regions, 400+ services
- Wrote the Terraform modules every team now uses to provision infrastructure
- Reduced deploy time from 45 minutes to 6 with a rebuilt CI/CD pipeline
- Built the observability stack on Prometheus and Grafana

Systems Administrator, Corvus Cloud, 2017 - 2019
- Managed Linux fleet and on-call rotation

EDUCATION
Bachelor of Science in Information Technology, Metro University, 2017
""",
    ),
    ResumeSample(
        key="mobile",
        label="Mobile engineer, 5 yrs, iOS + RN",
        expected_skills=(
            "Swift", "SwiftUI", "React Native", "TypeScript", "iOS",
            "REST API", "Git", "Unit Testing",
        ),
        text="""
Lena Fischer
lena.fischer@example.com | linkedin.com/in/lenafischer

SKILLS
Swift, SwiftUI, React Native, TypeScript, iOS, REST API, Git, Unit Testing

EXPERIENCE
Senior iOS Engineer, Wanderlust Apps, 2020 - 2024
- Shipped the rewrite of a 2M-download travel app in SwiftUI
- Raised crash-free sessions from 97.2% to 99.8%
- Built the shared React Native module used by both platform teams

iOS Engineer, Wanderlust Apps, 2019 - 2020
- Built offline sync for itineraries

EDUCATION
Bachelor of Science in Computer Science, Technical University, 2019
""",
    ),
    ResumeSample(
        key="qa",
        label="QA automation engineer, 4 yrs",
        expected_skills=(
            "Selenium", "Python", "Unit Testing", "Integration Testing",
            "CI/CD", "Jira", "SQL", "Agile",
        ),
        text="""
Ravi Menon
ravi.menon@example.com | linkedin.com/in/ravimenon

SKILLS
Selenium, Python, Unit Testing, Integration Testing, CI/CD, Jira, SQL, Agile

EXPERIENCE
QA Automation Engineer, Trellis Software, 2020 - 2024
- Built the regression suite covering 900 scenarios, run on every merge
- Cut manual regression time from three days to forty minutes
- Introduced flaky-test quarantine, lifting pipeline reliability to 98%

Manual QA Tester, Trellis Software, 2019 - 2020

EDUCATION
Bachelor of Science in Information Technology, State University, 2019
""",
    ),
    ResumeSample(
        key="designer",
        label="Product designer, 6 yrs (non-engineering control)",
        expected_skills=("Figma", "UI Design", "Accessibility", "Design"),
        text="""
Noor Haddad
noor.haddad@example.com | linkedin.com/in/noorhaddad

SKILLS
Figma, UI Design, Accessibility, Design, User Research, Prototyping

EXPERIENCE
Senior Product Designer, Anchor Health, 2019 - 2024
- Owned the design system across web and mobile products
- Ran fortnightly usability sessions and turned findings into a roadmap
- Redesigned onboarding, lifting activation 24%

Product Designer, Studio Cartwright, 2018 - 2019

EDUCATION
Bachelor of Arts, Art and Design College, 2018
""",
    ),
    ResumeSample(
        key="career_changer",
        label="Career changer into data (deliberately hard case)",
        expected_skills=("Python", "SQL", "Pandas", "Excel", "Statistics"),
        text="""
Grace Oduya
grace.oduya@example.com

SUMMARY
Six years in retail operations management, retraining into data analysis.
Completed a part-time data science certificate in 2024.

SKILLS
Python, SQL, Pandas, Excel, Statistics

EXPERIENCE
Store Operations Manager, Halstead Retail, 2018 - 2024
- Managed a team of 22 across two locations
- Built the weekly stock forecasting spreadsheet used region-wide
- Reduced shrinkage 12% through a new audit process

Assistant Manager, Halstead Retail, 2016 - 2018

EDUCATION
Certificate in Data Science, Online Institute, 2024
Bachelor of Business Administration, City College, 2016
""",
    ),
    ResumeSample(
        key="fullstack",
        label="Full-stack engineer, 5 yrs (spans two disciplines)",
        expected_skills=(
            "JavaScript", "TypeScript", "React", "Node.js", "Python",
            "PostgreSQL", "Docker", "REST API", "Amazon Web Services",
        ),
        text="""
Jonas Petersen
jonas.petersen@example.com | linkedin.com/in/jonaspetersen

SKILLS
JavaScript, TypeScript, React, Node.js, Python, PostgreSQL, Docker,
REST API, Amazon Web Services

EXPERIENCE
Full-Stack Engineer, Meridian Labs, 2019 - 2024
- Built and maintained both the React frontend and Node.js API
- Migrated the monolith to containerised services on AWS
- Shipped the reporting module used by 300 enterprise customers

Software Engineer, Kettle Digital, 2018 - 2019

EDUCATION
Bachelor of Science in Software Engineering, Northern University, 2018
""",
    ),
    ResumeSample(
        key="security",
        label="Security engineer, 6 yrs",
        expected_skills=(
            "Python", "Linux", "Penetration Testing", "Cryptography",
            "Amazon Web Services", "Networking",
        ),
        text="""
Elena Marchetti
elena.marchetti@example.com | linkedin.com/in/elenamarchetti

SKILLS
Penetration Testing, Cryptography, Python, Linux, Networking,
Amazon Web Services, Incident Response

EXPERIENCE
Security Engineer, Fortress Financial, 2019 - 2024
- Led the internal red team; found and closed 60+ high-severity issues
- Built automated secret scanning across 200 repositories
- Ran incident response for two production security events

Security Analyst, Fortress Financial, 2018 - 2019

EDUCATION
Bachelor of Science in Computer Science, Metro University, 2018
""",
    ),
]


# ---------------------------------------------------------------------------
# Jobs
# ---------------------------------------------------------------------------

JOBS: list[JobSample] = [
    JobSample(
        key="job_ds_senior",
        title="Senior Data Scientist",
        company="Halcyon Data",
        description="""
We are hiring a Senior Data Scientist to build predictive models and
production machine learning pipelines for our forecasting products. You will
own problems end to end, from framing to deployment, and mentor two junior
scientists.
""",
        requirements="""
5+ years of experience with Python and Machine Learning
Strong SQL and Statistics background
Hands-on with Pandas, NumPy and scikit-learn
Experience with Apache Spark and Docker
Master of Science preferred
""",
    ),
    JobSample(
        key="job_ds_junior",
        title="Junior Data Analyst",
        company="Halcyon Data",
        description="""
Entry-level analyst role supporting the commercial team. You will build
reporting, answer ad-hoc questions with SQL, and maintain dashboards.
""",
        requirements="""
0-2 years of experience
SQL and Excel essential
Python and Pandas desirable
Tableau or similar BI tool
Statistics coursework
""",
    ),
    JobSample(
        key="job_ml_engineer",
        title="Machine Learning Engineer",
        company="Vector Systems",
        description="""
Own the path from trained model to production service. You will build serving
infrastructure, orchestration and monitoring for our ML platform.
""",
        requirements="""
Strong Python
PyTorch or TensorFlow in production
Kubernetes and Docker
Apache Airflow or similar orchestration
CI/CD and Terraform
""",
    ),
    JobSample(
        key="job_frontend",
        title="Frontend Engineer",
        company="Pixelworks",
        description="""
Build delightful, accessible user interfaces for our customer-facing web
products. You will work closely with design and own features end to end.
""",
        requirements="""
3+ years of React and TypeScript
Strong CSS, ideally Tailwind CSS
Experience with Next.js and Redux
An eye for Accessibility
Testing with Jest
""",
    ),
    JobSample(
        key="job_backend",
        title="Backend Engineer (Python)",
        company="Ledgerly",
        description="""
Build and scale the Python services behind our payments platform. Expect deep
work on data models, performance and reliability.
""",
        requirements="""
5+ years of Python, ideally Django
PostgreSQL and Redis
REST API design
Docker and Amazon Web Services
Strong testing discipline
""",
    ),
    JobSample(
        key="job_devops",
        title="Platform / DevOps Engineer",
        company="Corvus Cloud",
        description="""
Own our Kubernetes platform and developer experience. You will make deploys
boring and observability excellent.
""",
        requirements="""
Kubernetes and Docker at scale
Terraform and Ansible
CI/CD pipelines, Jenkins or GitHub Actions
Prometheus and Grafana
Strong Linux and Bash
""",
    ),
    JobSample(
        key="job_mobile",
        title="Senior iOS Engineer",
        company="Wanderlust Apps",
        description="""
Lead development of our flagship iOS application, used by two million
travellers.
""",
        requirements="""
5+ years of Swift and iOS
SwiftUI
React Native a plus
REST API integration
Unit Testing
""",
    ),
    JobSample(
        key="job_qa",
        title="QA Automation Engineer",
        company="Trellis Software",
        description="""
Own our automated test estate and keep the release pipeline trustworthy.
""",
        requirements="""
Selenium or comparable browser automation
Python scripting
CI/CD integration
Agile delivery, Jira
SQL for data verification
""",
    ),
    JobSample(
        key="job_designer",
        title="Senior Product Designer",
        company="Anchor Health",
        description="""
Own end-to-end product design for our patient-facing applications, from
research through to a maintained design system.
""",
        requirements="""
5+ years of product design
Figma
Design systems and UI Design
Accessibility
User research and prototyping
""",
    ),
    JobSample(
        key="job_fullstack",
        title="Full-Stack Engineer",
        company="Meridian Labs",
        description="""
Work across our React frontend and Node.js backend. Small team, broad
ownership.
""",
        requirements="""
JavaScript and TypeScript
React on the frontend
Node.js on the backend
PostgreSQL
Docker and Amazon Web Services
""",
    ),
    JobSample(
        key="job_security",
        title="Security Engineer",
        company="Fortress Financial",
        description="""
Join our security engineering team covering offensive testing, incident
response, and hardening of cloud infrastructure.
""",
        requirements="""
Penetration Testing experience
Strong Linux and Networking
Python for tooling
Cryptography fundamentals
Amazon Web Services security
""",
    ),
    JobSample(
        key="job_data_engineer",
        title="Data Engineer",
        company="Northwind Analytics",
        description="""
Build the pipelines that feed our analytics and ML workloads.
""",
        requirements="""
Strong SQL and Python
Apache Spark and Apache Airflow
Data Warehousing, ideally Snowflake
Docker
ETL design
""",
    ),
    JobSample(
        key="job_marketing",
        title="Marketing Manager",
        company="Brightline Media",
        description="""
Own campaign strategy and execution across paid and organic channels.
Deliberately outside the engineering domain: nothing technical should rank
highly here.
""",
        requirements="""
5+ years in marketing
Campaign management and Content Creation
SEO and paid acquisition
Strong Communication and Copywriting
Budget ownership
""",
    ),
]


# ---------------------------------------------------------------------------
# Relevance judgements
# ---------------------------------------------------------------------------
# Only non-zero grades are listed; anything absent is 0 (irrelevant).

RELEVANCE: dict[tuple[str, str], int] = {
    # Senior data scientist
    ("ds_senior", "job_ds_senior"): 3,
    ("ds_senior", "job_ml_engineer"): 2,
    ("ds_senior", "job_data_engineer"): 2,
    ("ds_senior", "job_ds_junior"): 1,  # over-qualified
    # Junior analyst
    ("ds_junior", "job_ds_junior"): 3,
    ("ds_junior", "job_data_engineer"): 1,
    ("ds_junior", "job_ds_senior"): 1,  # right field, wrong level
    # ML engineer
    ("ml_engineer", "job_ml_engineer"): 3,
    ("ml_engineer", "job_data_engineer"): 2,
    ("ml_engineer", "job_ds_senior"): 2,
    ("ml_engineer", "job_devops"): 2,
    # Frontend
    ("frontend", "job_frontend"): 3,
    ("frontend", "job_fullstack"): 2,
    ("frontend", "job_mobile"): 1,  # React Native adjacency
    # Backend
    ("backend", "job_backend"): 3,
    ("backend", "job_fullstack"): 2,
    ("backend", "job_data_engineer"): 1,
    ("backend", "job_devops"): 1,
    # DevOps
    ("devops", "job_devops"): 3,
    ("devops", "job_ml_engineer"): 2,
    ("devops", "job_backend"): 1,
    ("devops", "job_security"): 1,
    # Mobile
    ("mobile", "job_mobile"): 3,
    ("mobile", "job_frontend"): 2,
    ("mobile", "job_fullstack"): 1,
    # QA
    ("qa", "job_qa"): 3,
    ("qa", "job_backend"): 1,
    # Designer (control: should not match engineering roles)
    ("designer", "job_designer"): 3,
    ("designer", "job_frontend"): 1,
    # Career changer (hard case: real skills, no professional history)
    ("career_changer", "job_ds_junior"): 2,
    ("career_changer", "job_data_engineer"): 1,
    # Full-stack (legitimately spans two roles)
    ("fullstack", "job_fullstack"): 3,
    ("fullstack", "job_frontend"): 2,
    ("fullstack", "job_backend"): 2,
    # Security
    ("security", "job_security"): 3,
    ("security", "job_devops"): 2,
}


def load() -> EvaluationSet:
    return EvaluationSet(resumes=RESUMES, jobs=JOBS, relevance=dict(RELEVANCE))

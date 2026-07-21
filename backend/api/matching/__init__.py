"""Resume/job matching engine.

Public entry points:

- :func:`api.matching.parser.parse_document` -- bytes -> structured resume text
- :func:`api.matching.skills.extract_skills` -- text -> canonical skill list
- :func:`api.matching.scorer.recommend_jobs` -- resume -> ranked open jobs
- :func:`api.matching.ats.build_ats_report` -- resume + JD -> full ATS report

The scorer is deliberately behind a narrow interface so an embedding-based
backend can replace the TF-IDF/BM25 one without touching the views.
"""

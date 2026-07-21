# Legacy source data

Original inputs from before the matching engine rework. **Nothing reads these.**
They are kept only so the derived files can be regenerated or audited.

| File | Superseded by | How |
|---|---|---|
| `skills.csv` | `../skills.csv` | CamelCase entries split into natural phrasing (`PublicSpeaking` → `Public Speaking`), original spellings retained as aliases, case-insensitive dedupe, plus a curated supplement of ~70 modern tools the original list omitted entirely (Pandas, NumPy, TensorFlow, scikit-learn, Terraform, …). |
| `job_descriptions.csv` | `../seed_jobs.csv` | Joined row-wise with `cleaned_data.csv`. |
| `cleaned_data.csv` | `../seed_jobs.csv` | As above. |

These previously lived in `backend/static/`, which is a `STATICFILES_DIRS`
entry — `collectstatic` would have published them publicly. They were moved
here for that reason as much as for tidiness.

`job_descriptions.csv` and `cleaned_data.csv` were never tracked in git despite
being required at runtime, so a fresh clone could not produce recommendations
at all. Their replacement is tracked.

Safe to delete once you are satisfied with the derived files.

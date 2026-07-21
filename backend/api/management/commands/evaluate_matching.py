"""Measure retrieval and extraction quality against the labelled dataset."""

from django.core.management.base import BaseCommand

from api.evaluation import metrics
from api.evaluation.runner import run_all


class Command(BaseCommand):
    help = "Evaluate the matching engine against api/evaluation/dataset.py."

    def add_arguments(self, parser):
        parser.add_argument(
            "--detail",
            action="store_true",
            help="Show the per-resume ranking and every extraction miss.",
        )
        parser.add_argument(
            "--json",
            action="store_true",
            help="Emit machine-readable results instead of a table.",
        )

    def handle(self, *args, **options):
        data, ranking, extraction = run_all()

        if options["json"]:
            import json
            from dataclasses import asdict

            self.stdout.write(
                json.dumps(
                    {
                        "ranking": [asdict(r) for r in ranking],
                        "extraction": asdict(extraction),
                    },
                    indent=2,
                )
            )
            return

        graded_pairs = sum(1 for v in data.relevance.values() if v > 0)
        self.stdout.write(self.style.MIGRATE_HEADING("\nDATASET"))
        self.stdout.write(
            f"  {len(data.resumes)} resumes x {len(data.jobs)} jobs = "
            f"{len(data.resumes) * len(data.jobs)} pairs, "
            f"{graded_pairs} graded non-zero"
        )
        self.stdout.write(
            self.style.WARNING(
                "  Labels are hand-authored, not real hiring outcomes. Use these\n"
                "  numbers to compare scorer versions, not to claim production accuracy."
            )
        )

        self.stdout.write(self.style.MIGRATE_HEADING("\nRANKING QUALITY"))
        header = (
            f"  {'configuration':<30} {'NDCG@3':>7} {'NDCG@5':>7} {'P@1':>6} "
            f"{'P@3':>6} {'R@5':>6} {'MRR':>6} {'best-1st':>9}"
        )
        self.stdout.write(header)
        self.stdout.write("  " + "-" * (len(header) - 2))

        best = max(ranking, key=lambda r: r.ndcg_at_5)
        for report in ranking:
            line = (
                f"  {report.configuration:<30} {report.ndcg_at_3:>7.3f} "
                f"{report.ndcg_at_5:>7.3f} {report.precision_at_1:>6.3f} "
                f"{report.precision_at_3:>6.3f} {report.recall_at_5:>6.3f} "
                f"{report.mrr:>6.3f} {report.perfect_top_rate:>9.3f}"
            )
            if report is best:
                self.stdout.write(self.style.SUCCESS(line + "  <- best NDCG@5"))
            else:
                self.stdout.write(line)

        shipped = ranking[0]
        self.stdout.write(
            "\n  Reading these: NDCG@5 is the headline (1.000 = perfect ordering).\n"
            "  P@1 is how often the top result is a genuine match. 'best-1st' is\n"
            "  how often the single best available job ranks first."
        )

        self.stdout.write(self.style.MIGRATE_HEADING("\nSKILL EXTRACTION"))
        self.stdout.write(
            f"  macro  P {extraction.macro_precision:.3f}  "
            f"R {extraction.macro_recall:.3f}  F1 {extraction.macro_f1:.3f}"
        )
        self.stdout.write(
            f"  micro  P {extraction.micro_precision:.3f}  "
            f"R {extraction.micro_recall:.3f}  F1 {extraction.micro_f1:.3f}"
        )

        worst = sorted(extraction.per_resume, key=lambda r: r.prf.f1)[:3]
        self.stdout.write("\n  Weakest extractions:")
        for result in worst:
            self.stdout.write(
                f"    {result.resume_label:<38} F1 {result.prf.f1:.2f}"
                + (f"  missed: {', '.join(result.missed)}" if result.missed else "")
            )

        if options["detail"]:
            self.stdout.write(
                self.style.MIGRATE_HEADING(
                    f"\nPER-RESUME RANKING -- {shipped.configuration}"
                )
            )
            for result in shipped.per_resume:
                marker = (
                    self.style.SUCCESS("ok  ")
                    if result.top_grade >= metrics.RELEVANT_THRESHOLD
                    else self.style.ERROR("MISS")
                )
                self.stdout.write(
                    f"  {marker} {result.resume_label:<38} "
                    f"top={result.top_job_key} (grade {result.top_grade})"
                )
                self.stdout.write(
                    "       order: "
                    + " ".join(
                        f"{key}({grade})"
                        for key, grade in list(
                            zip(result.ranked_job_keys, result.graded, strict=False)
                        )[:5]
                    )
                )

            self.stdout.write(
                self.style.MIGRATE_HEADING("\nEXTRACTION DETAIL")
            )
            for result in extraction.per_resume:
                self.stdout.write(
                    f"  {result.resume_label:<38} "
                    f"P {result.prf.precision:.2f} R {result.prf.recall:.2f} "
                    f"F1 {result.prf.f1:.2f}"
                )
                if result.missed:
                    self.stdout.write(f"       missed:   {', '.join(result.missed)}")
                if result.spurious:
                    self.stdout.write(
                        f"       extra:    {', '.join(result.spurious[:12])}"
                    )

        self.stdout.write("")

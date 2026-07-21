import django_filters

from .models import Job


class JobFilter(django_filters.FilterSet):
    job_type = django_filters.MultipleChoiceFilter(choices=Job.JobType.choices)
    location = django_filters.CharFilter(lookup_expr="icontains")
    company_name = django_filters.CharFilter(lookup_expr="icontains")
    salary_min = django_filters.NumberFilter(field_name="salary_max", lookup_expr="gte")
    salary_max = django_filters.NumberFilter(field_name="salary_min", lookup_expr="lte")
    is_remote = django_filters.BooleanFilter()
    posted_after = django_filters.DateTimeFilter(field_name="posted_at", lookup_expr="gte")

    class Meta:
        model = Job
        fields = ["job_type", "location", "company_name", "is_remote"]

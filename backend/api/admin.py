from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.urls import reverse
from django.utils.html import format_html

from .models import Application, CustomUser, Job, RecruiterProfile, Resume


class RecruiterProfileInline(admin.StackedInline):
    model = RecruiterProfile
    can_delete = False
    extra = 0


@admin.register(CustomUser)
class CustomUserAdmin(UserAdmin):
    list_display = ("username", "email", "role", "is_staff", "is_active", "date_joined")
    list_filter = ("role", "is_staff", "is_active")
    search_fields = ("username", "email", "first_name", "last_name")
    ordering = ("-date_joined",)
    inlines = [RecruiterProfileInline]
    fieldsets = UserAdmin.fieldsets + (("Role", {"fields": ("role",)}),)
    add_fieldsets = UserAdmin.add_fieldsets + (
        ("Role", {"fields": ("email", "role")}),
    )


@admin.register(Job)
class JobAdmin(admin.ModelAdmin):
    list_display = (
        "job_title",
        "company_name",
        "location",
        "job_type",
        "is_active",
        "expiry_time",
        "applicant_count",
        "posted_at",
    )
    list_filter = ("job_type", "is_active", "is_remote", "posted_at")
    search_fields = ("job_title", "company_name", "location")
    autocomplete_fields = ("recruiter",)
    readonly_fields = ("posted_at", "updated_at", "searchable_text", "extracted_skills")
    date_hierarchy = "posted_at"

    @admin.display(description="Applicants")
    def applicant_count(self, obj) -> int:
        return obj.applications.count()


@admin.register(Application)
class ApplicationAdmin(admin.ModelAdmin):
    list_display = ("user", "job", "status", "match_score", "applied_at", "resume_link")
    list_filter = ("status", "applied_at")
    list_editable = ("status",)
    search_fields = ("user__username", "user__email", "job__job_title")
    autocomplete_fields = ("user", "job")
    readonly_fields = ("applied_at", "status_changed_at", "match_score")

    @admin.display(description="Resume")
    def resume_link(self, obj):
        if not obj.resume_id:
            return "—"
        # Goes through the permission-checked download endpoint rather than
        # exposing a raw storage URL.
        url = reverse("resume-download", kwargs={"pk": obj.resume_id})
        return format_html('<a href="{}" target="_blank" rel="noopener">Download</a>', url)


@admin.register(Resume)
class ResumeAdmin(admin.ModelAdmin):
    list_display = ("user", "original_filename", "is_primary", "skill_count", "uploaded_at")
    list_filter = ("is_primary", "uploaded_at")
    search_fields = ("user__username", "original_filename")
    readonly_fields = (
        "parsed_text",
        "extracted_skills",
        "extracted_education",
        "parsed_at",
        "size_bytes",
        "content_type",
    )

    @admin.display(description="Skills")
    def skill_count(self, obj) -> int:
        return len(obj.extracted_skills or [])


admin.site.site_header = "Resumatch"
admin.site.site_title = "Resumatch admin"
admin.site.index_title = "Administration"

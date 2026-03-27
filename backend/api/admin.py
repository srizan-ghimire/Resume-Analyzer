from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import CustomUser,FileUpload,SavedJob,Recruiter,Job
from django.utils.html import format_html
# Register your models here.
# class CustomUserAdmin(UserAdmin):
#     model = CustomUser
#     list_display = ('username', 'email', 'first_name', 'last_name', 'is_staff', 'is_active', 'date_joined')
#     list_filter = ('is_staff', 'is_active')
#     search_fields = ('username', 'email')
#     ordering = ('date_joined',)

# admin.site.register(CustomUser, CustomUserAdmin)
# admin.site.register(FileUpload)
@admin.register(SavedJob)
class SavedJobAdmin(admin.ModelAdmin):
    # verbose_name="Job Application"
    list_display = ('user', 'job', 'status','view_resume','download_resume')
    list_filter = ('status',)
    list_editable = ('status',)

    def view_resume(self, obj):
        """Display a link to view the resume."""
        file = FileUpload.objects.filter(user=obj.user).first()
        if file and file.file:
            return format_html('<a href="{}" target="_blank">View Resume</a>', file.file.url)
        return "No Resume"

    def download_resume(self, obj):
        """Display a download link for the resume."""
        file = FileUpload.objects.filter(user=obj.user).first()
        if file and file.file:
            return format_html('<a href="{}" download>Download Resume</a>', file.file.url)
        return "No Resume"

    view_resume.short_description = "Resume"
    download_resume.short_description = "Download"
    

# Job Admin
@admin.register(Job)
class JobAdmin(admin.ModelAdmin):
    list_display = ('job_title', 'company_name', 'location', 'job_type', 'posted_at','get_recruiter_name')
    list_filter = ('job_type', 'posted_at', 'location')
    search_fields = ('job_title', 'company_name', 'location')
    ordering = ('-posted_at',)

    def get_recruiter_name(self,obj):
        return obj.recruiter.username
    get_recruiter_name.short_description = 'Recruiter Name'

# Recruiter Admin
# @admin.register(Recruiter)
# class RecruiterAdmin(admin.ModelAdmin):
#     model = Recruiter
#     list_display = ('username', 'email', )
#     search_fields = ('username', 'email', )

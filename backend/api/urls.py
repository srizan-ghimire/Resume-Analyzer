from django.urls import path
from . import views
from django.conf import settings
from django.conf.urls.static import static
urlpatterns = [
    path('home/',views.home,name="home"),
    path('register/',views.register_user,name="register"),
    path('login/',views.login,name="login"),
    path('logout/',views.logout,name="logout"),
    path('file/',views.file_upload,name="file_upload"),
    path('recommend/<str:username>/',views.recommend_jobs,name='recommend'),
    path('ats/',views.ats_score_computation,name='ats'),
    path('apply_job/<int:id>',views.apply_job,name='apply'),
    path('applied_jobs/',views.applied_job,name='applied'),
    #for recruiter
    path('recruiter_login/',views.recruiter_login,name='recruiterLogin'),
    path('recruiter_logout/',views.recruiter_logout,name='recruiterLogout'),
    path('recruiter_register/',views.recruiter_register,name='recruiterRegister'),
    path('job/',views.job,name='job'),
    path('job/<int:id>/',views.get_job,name="getjob"),
    path('applyfeaturedjob/',views.recommend_save_job,name="applyfeaturejob"),
    path('status/',views.recruiter_update_status,name='status'),
    
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

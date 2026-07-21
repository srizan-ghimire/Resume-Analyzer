from django.urls import include, path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView, TokenVerifyView

from . import views

router = DefaultRouter()
router.register("jobs", views.JobViewSet, basename="job")
router.register("applications", views.ApplicationViewSet, basename="application")
router.register("resumes", views.ResumeViewSet, basename="resume")

auth_patterns = [
    path("register/", views.RegisterView.as_view(), name="register"),
    path("login/", views.LoginView.as_view(), name="login"),
    path("logout/", views.LogoutView.as_view(), name="logout"),
    path("refresh/", TokenRefreshView.as_view(), name="token-refresh"),
    path("verify/", TokenVerifyView.as_view(), name="token-verify"),
    path("me/", views.MeView.as_view(), name="me"),
    path("change-password/", views.ChangePasswordView.as_view(), name="change-password"),
]

urlpatterns = [
    path("auth/", include(auth_patterns)),
    path("recommendations/", views.RecommendationView.as_view(), name="recommendations"),
    path("ats-report/", views.AtsReportView.as_view(), name="ats-report"),
    path("health/", views.HealthView.as_view(), name="health"),
    path("", include(router.urls)),
]

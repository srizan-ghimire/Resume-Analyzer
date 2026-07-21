"""
Django settings for the Resumatch backend.

All environment-specific configuration is read from environment variables (see
``.env.example`` at the repository root). Nothing secret is hard-coded here.
"""

from datetime import timedelta
from pathlib import Path

import environ
from django.core.exceptions import ImproperlyConfigured

BASE_DIR = Path(__file__).resolve().parent.parent
REPO_ROOT = BASE_DIR.parent

env = environ.Env(
    DEBUG=(bool, False),
    ALLOWED_HOSTS=(list, []),
    CORS_ALLOWED_ORIGINS=(list, []),
    USE_S3=(bool, False),
    SECURE_SSL_REDIRECT=(bool, False),
)

# Read .env from the repo root if present. Absent in deployed environments,
# where real environment variables are used instead.
for candidate in (REPO_ROOT / ".env", BASE_DIR / ".env"):
    if candidate.exists():
        env.read_env(str(candidate))
        break

DEBUG = env("DEBUG")

DEV_SECRET_KEY = "dev-only-insecure-key-do-not-use-in-production"
SECRET_KEY = env("SECRET_KEY", default=None) or env(
    "DJANGO_SECRET_KEY", default=DEV_SECRET_KEY
)

if not DEBUG and SECRET_KEY == DEV_SECRET_KEY:
    # Refuse to start rather than serve production traffic with a key that is
    # published in this repository. Django's own W009 is only a warning, and
    # only fires by accident of key length.
    raise ImproperlyConfigured(
        "SECRET_KEY is unset and DEBUG is off. Set a real SECRET_KEY; generate "
        "one with: python -c \"from django.core.management.utils import "
        'get_random_secret_key as k; print(k())"'
    )

ALLOWED_HOSTS = env("ALLOWED_HOSTS")
if DEBUG and not ALLOWED_HOSTS:
    ALLOWED_HOSTS = ["localhost", "127.0.0.1", "[::1]"]

# Render/Railway expose the deployed hostname this way.
RENDER_EXTERNAL_HOSTNAME = env("RENDER_EXTERNAL_HOSTNAME", default=None)
if RENDER_EXTERNAL_HOSTNAME:
    ALLOWED_HOSTS.append(RENDER_EXTERNAL_HOSTNAME)

BRAND_NAME = env("BRAND_NAME", default="Resumatch")


# --------------------------------------------------------------------------
# Applications
# --------------------------------------------------------------------------

INSTALLED_APPS = [
    "jazzmin",
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "django_filters",
    "drf_spectacular",
    "corsheaders",
    "rest_framework_simplejwt.token_blacklist",
    "api",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "backend.urls"
WSGI_APPLICATION = "backend.wsgi.application"
AUTH_USER_MODEL = "api.CustomUser"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]


# --------------------------------------------------------------------------
# Database
# --------------------------------------------------------------------------

DATABASES = {
    "default": env.db_url(
        "DATABASE_URL",
        default=f"sqlite:///{BASE_DIR / 'db.sqlite3'}",
    )
}
DATABASES["default"]["CONN_MAX_AGE"] = env.int("CONN_MAX_AGE", default=60)

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"


# --------------------------------------------------------------------------
# Auth
# --------------------------------------------------------------------------

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
        "OPTIONS": {"min_length": 8},
    },
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=env.int("ACCESS_TOKEN_MINUTES", default=30)),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=env.int("REFRESH_TOKEN_DAYS", default=7)),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "UPDATE_LAST_LOGIN": True,
    "AUTH_HEADER_TYPES": ("Bearer",),
    "SIGNING_KEY": SECRET_KEY,
}


# --------------------------------------------------------------------------
# REST framework
# --------------------------------------------------------------------------

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ],
    # Secure by default: endpoints opt out explicitly with AllowAny.
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_FILTER_BACKENDS": [
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.SearchFilter",
        "rest_framework.filters.OrderingFilter",
    ],
    "DEFAULT_PAGINATION_CLASS": "api.pagination.DefaultPagination",
    "PAGE_SIZE": 20,
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "EXCEPTION_HANDLER": "api.exceptions.api_exception_handler",
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.ScopedRateThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {
        "auth": env("THROTTLE_AUTH", default="10/min"),
        "scoring": env("THROTTLE_SCORING", default="20/min"),
        "upload": env("THROTTLE_UPLOAD", default="20/hour"),
    },
}

SPECTACULAR_SETTINGS = {
    "TITLE": f"{BRAND_NAME} API",
    "DESCRIPTION": "Resume analysis, job matching and application tracking.",
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
    "COMPONENT_SPLIT_REQUEST": True,
    "SCHEMA_PATH_PREFIX": "/api/v1",
}


# --------------------------------------------------------------------------
# CORS
# --------------------------------------------------------------------------

CORS_ALLOWED_ORIGINS = env("CORS_ALLOWED_ORIGINS")
if DEBUG and not CORS_ALLOWED_ORIGINS:
    CORS_ALLOWED_ORIGINS = ["http://localhost:5173", "http://127.0.0.1:5173"]
CORS_ALLOW_CREDENTIALS = False

CSRF_TRUSTED_ORIGINS = env("CSRF_TRUSTED_ORIGINS", default=CORS_ALLOWED_ORIGINS)


# --------------------------------------------------------------------------
# Internationalization
# --------------------------------------------------------------------------

LANGUAGE_CODE = "en-us"
TIME_ZONE = env("TIME_ZONE", default="UTC")
USE_I18N = True
USE_TZ = True


# --------------------------------------------------------------------------
# Static & media
# --------------------------------------------------------------------------

STATIC_URL = "static/"
STATICFILES_DIRS = [BASE_DIR / "static"]
STATIC_ROOT = BASE_DIR / "staticfiles"

MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    "staticfiles": {
        "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
    },
}

USE_S3 = env("USE_S3")
if USE_S3:
    # Resume files must never be publicly listable: they are served through
    # api.views.resumes.resume_download after a permission check.
    STORAGES["default"] = {
        "BACKEND": "storages.backends.s3.S3Storage",
        "OPTIONS": {
            "bucket_name": env("AWS_STORAGE_BUCKET_NAME"),
            "region_name": env("AWS_S3_REGION_NAME", default="auto"),
            "endpoint_url": env("AWS_S3_ENDPOINT_URL", default=None),
            "access_key": env("AWS_ACCESS_KEY_ID"),
            "secret_key": env("AWS_SECRET_ACCESS_KEY"),
            "default_acl": "private",
            "querystring_auth": True,
            "querystring_expire": 300,
            "file_overwrite": False,
        },
    }


# --------------------------------------------------------------------------
# Uploads
# --------------------------------------------------------------------------

RESUME_MAX_BYTES = env.int("RESUME_MAX_BYTES", default=5 * 1024 * 1024)
RESUME_ALLOWED_EXTENSIONS = ["pdf", "docx"]
DATA_UPLOAD_MAX_MEMORY_SIZE = RESUME_MAX_BYTES + (1024 * 1024)
FILE_UPLOAD_MAX_MEMORY_SIZE = DATA_UPLOAD_MAX_MEMORY_SIZE


# --------------------------------------------------------------------------
# Caching (matching engine artifacts)
# --------------------------------------------------------------------------

REDIS_URL = env("REDIS_URL", default=None)
if REDIS_URL:
    CACHES = {"default": env.cache_url("REDIS_URL")}
else:
    CACHES = {
        "default": {
            "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
            "LOCATION": "resumatch-local",
        }
    }


# --------------------------------------------------------------------------
# Security (active when DEBUG is off)
# --------------------------------------------------------------------------

if not DEBUG:
    SECURE_SSL_REDIRECT = env("SECURE_SSL_REDIRECT", default=True)
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_HSTS_SECONDS = env.int("SECURE_HSTS_SECONDS", default=31536000)
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    X_FRAME_OPTIONS = "DENY"


# --------------------------------------------------------------------------
# Logging
# --------------------------------------------------------------------------

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "verbose": {
            "format": "{levelname} {asctime} {name} {message}",
            "style": "{",
        },
    },
    "handlers": {
        "console": {"class": "logging.StreamHandler", "formatter": "verbose"},
    },
    "root": {"handlers": ["console"], "level": env("LOG_LEVEL", default="INFO")},
    "loggers": {
        "django.db.backends": {"level": "WARNING", "handlers": ["console"], "propagate": False},
    },
}


# --------------------------------------------------------------------------
# Admin theme
# --------------------------------------------------------------------------

JAZZMIN_SETTINGS = {
    "site_title": f"{BRAND_NAME} Admin",
    "site_header": BRAND_NAME,
    "site_brand": BRAND_NAME,
    "welcome_sign": f"Welcome to {BRAND_NAME}",
    "theme": "flatly",
    "show_ui_builder": False,
    "show_sidebar": True,
    "navigation_expanded": True,
    "hide_apps": [],
    "hide_models": ["auth.group"],
    "icons": {
        "api.CustomUser": "fas fa-user",
        "api.RecruiterProfile": "fas fa-building",
        "api.Job": "fas fa-briefcase",
        "api.Application": "fas fa-file-signature",
        "api.Resume": "fas fa-file-pdf",
    },
    "changeform_format": "horizontal_tabs",
}

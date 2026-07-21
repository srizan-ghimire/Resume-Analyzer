"""Settings for the test suite.

Inherits production defaults -- so tests run against the same secure-by-default
configuration -- and relaxes only what makes tests impossible or needlessly slow.
"""

import os

# Must precede the import: settings.py refuses to load with DEBUG off and no
# SECRET_KEY, and these settings deliberately keep DEBUG off so tests run
# against the production configuration.
os.environ.setdefault("SECRET_KEY", "test-only-key-not-used-outside-the-suite")

from .settings import *  # noqa: E402, F403

# The production guard rails redirect every request to HTTPS, which the test
# client cannot follow.
SECURE_SSL_REDIRECT = False
SECURE_HSTS_SECONDS = 0

DEBUG = False
ALLOWED_HOSTS = ["testserver", "localhost", "127.0.0.1"]

DATABASES = {  # noqa: F405
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": ":memory:",
    }
}

# PBKDF2 with default iterations dominates runtime in auth-heavy tests.
PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]

# Throttling is exercised in its own test, not incidentally everywhere else.
REST_FRAMEWORK = {  # noqa: F405
    **REST_FRAMEWORK,  # noqa: F405
    "DEFAULT_THROTTLE_RATES": {
        "auth": "1000/min",
        "scoring": "1000/min",
        "upload": "1000/min",
    },
}

STORAGES = {  # noqa: F405
    "default": {"BACKEND": "django.core.files.storage.InMemoryStorage"},
    "staticfiles": {"BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage"},
}

CACHES = {  # noqa: F405
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
        "LOCATION": "resumatch-test",
    }
}

LOGGING["root"]["level"] = "ERROR"  # noqa: F405

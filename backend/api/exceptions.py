"""Uniform error envelope for every API response.

DRF's default shape varies by exception type -- sometimes a dict of field
errors, sometimes ``{"detail": ...}``, sometimes a bare list. Clients had to
guess. Everything now comes back as::

    {"error": {"code": "validation_error",
               "message": "...",
               "details": {"field": ["..."]}}}
"""

from __future__ import annotations

import logging

from django.core.exceptions import PermissionDenied
from django.http import Http404
from rest_framework import exceptions
from rest_framework.response import Response
from rest_framework.views import exception_handler as drf_exception_handler

logger = logging.getLogger(__name__)


def _flatten_message(data) -> str:
    if isinstance(data, str):
        return data
    if isinstance(data, list) and data:
        return _flatten_message(data[0])
    if isinstance(data, dict):
        if "detail" in data:
            return _flatten_message(data["detail"])
        for value in data.values():
            return _flatten_message(value)
    return "Request failed."


def api_exception_handler(exc, context):
    if isinstance(exc, Http404):
        exc = exceptions.NotFound()
    elif isinstance(exc, PermissionDenied):
        exc = exceptions.PermissionDenied()

    response = drf_exception_handler(exc, context)
    if response is None:
        # Unhandled: log with traceback, return an opaque 500 rather than
        # leaking internals.
        logger.exception("Unhandled API exception", exc_info=exc)
        return None

    code = getattr(exc, "default_code", "error")
    detail = response.data

    if isinstance(detail, dict) and set(detail) == {"detail"}:
        details = None
        message = _flatten_message(detail["detail"])
    elif isinstance(detail, dict):
        details = detail
        message = _flatten_message(detail)
    else:
        details = None
        message = _flatten_message(detail)

    payload = {"error": {"code": code, "message": message}}
    if details:
        payload["error"]["details"] = details

    return Response(payload, status=response.status_code, headers=_headers(response))


def _headers(response: Response) -> dict:
    # Preserve Retry-After / WWW-Authenticate set by throttling and auth.
    return {
        key: value
        for key, value in response.headers.items()
        if key.lower() in {"retry-after", "www-authenticate"}
    }

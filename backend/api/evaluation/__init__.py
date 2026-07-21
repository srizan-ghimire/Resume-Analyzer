"""Offline evaluation for the matching engine.

Ranking quality cannot be asserted by unit tests -- a wrong ranking still
returns 200 OK. This package holds a labelled dataset and the metrics needed to
put a number on retrieval quality and skill-extraction quality, so changes to
the scorer can be compared rather than guessed at.

Run it with::

    python manage.py evaluate_matching

Read ``dataset.py`` before trusting any number it prints: the relevance labels
are hand-authored, not collected from real hiring outcomes.
"""

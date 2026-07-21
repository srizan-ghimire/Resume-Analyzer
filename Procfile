release: python backend/manage.py migrate --noinput
web: gunicorn backend.wsgi:application --chdir backend --workers 3 --timeout 120 --bind 0.0.0.0:$PORT

import time
from django.contrib.auth import logout


class IdleSessionMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.user.is_authenticated:
            now = time.time()
            if now - request.session.get('last_activity', now) >= 1800:
                logout(request)
            else:
                request.session['last_activity'] = now
                request.session.set_expiry(1800)
        response = self.get_response(request)
        # Health data, reports, invitation links and credentials must not be cached.
        response['Cache-Control'] = 'private, no-store'
        response['Referrer-Policy'] = 'same-origin'
        return response

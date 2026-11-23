"""Server-side action permissions, independent of page layout."""
from django.core.exceptions import PermissionDenied


def require_role(user, *roles):
    if not user.is_active or user.role not in roles:
        raise PermissionDenied

from django.contrib.auth import get_user_model

from .models import Notification


User = get_user_model()


def create_notification(*, user, category: str, title: str, message: str, payload: dict | None = None):
    return Notification.objects.create(
        user=user,
        category=category,
        title=title,
        message=message,
        payload=payload or {},
    )


def notify_admins(*, category: str, title: str, message: str, payload: dict | None = None, exclude_user_id: int | None = None):
    admins = User.objects.filter(is_staff=True).only("id")
    if exclude_user_id:
        admins = admins.exclude(id=exclude_user_id)

    rows = [
        Notification(
            user=admin,
            category=category,
            title=title,
            message=message,
            payload=payload or {},
        )
        for admin in admins
    ]
    if rows:
        Notification.objects.bulk_create(rows)

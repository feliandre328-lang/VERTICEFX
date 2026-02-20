from django.conf import settings
from django.db import models


class Notification(models.Model):
    CATEGORY_SYSTEM = "SYSTEM"
    CATEGORY_INVESTMENT = "INVESTMENT"
    CATEGORY_WITHDRAWAL = "WITHDRAWAL"
    CATEGORY_PERFORMANCE = "PERFORMANCE"

    CATEGORY_CHOICES = [
        (CATEGORY_SYSTEM, "System"),
        (CATEGORY_INVESTMENT, "Investment"),
        (CATEGORY_WITHDRAWAL, "Withdrawal"),
        (CATEGORY_PERFORMANCE, "Performance"),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notifications",
    )
    category = models.CharField(max_length=24, choices=CATEGORY_CHOICES, default=CATEGORY_SYSTEM)
    title = models.CharField(max_length=120)
    message = models.CharField(max_length=255)
    payload = models.JSONField(default=dict, blank=True)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "is_read", "created_at"]),
            models.Index(fields=["user", "created_at"]),
        ]

    def __str__(self):
        return f"Notification({self.user_id}) {self.category} {self.title}"

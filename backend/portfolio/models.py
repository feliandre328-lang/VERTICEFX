from django.conf import settings
from django.db import models


class Investment(models.Model):
    STATUS_PENDING = "PENDING"
    STATUS_APPROVED = "APPROVED"
    STATUS_REJECTED = "REJECTED"

    STATUS_CHOICES = [
        (STATUS_PENDING, "Pendente"),
        (STATUS_APPROVED, "Aprovado"),
        (STATUS_REJECTED, "Rejeitado"),
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="investments")
    amount_cents = models.PositiveIntegerField()
    status = models.CharField(max_length=12, choices=STATUS_CHOICES, default=STATUS_PENDING)

    paid_at = models.DateTimeField(null=True, blank=True)
    external_ref = models.CharField(max_length=80, null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Investment({self.user_id}) {self.amount_cents} {self.status}"

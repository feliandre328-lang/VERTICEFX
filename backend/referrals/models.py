import secrets

from django.conf import settings
from django.db import models
from django.db.models import Q


class ReferralProfile(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="referral_profile",
    )
    referral_code = models.CharField(max_length=24, unique=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"ReferralProfile({self.user_id}) {self.referral_code}"

    @staticmethod
    def generate_code(prefix: str = "VFX") -> str:
        token = secrets.token_hex(4).upper()
        return f"{prefix}-{token}"


class ReferralInvite(models.Model):
    STATUS_PENDING = "PENDING"
    STATUS_ACTIVE = "ACTIVE"
    STATUS_CHOICES = [
        (STATUS_PENDING, "Pendente"),
        (STATUS_ACTIVE, "Ativo"),
    ]

    referrer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="referral_invites_sent",
    )
    referred_user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="referral_invite_received",
        null=True,
        blank=True,
    )
    referred_name = models.CharField(max_length=120, blank=True)
    referred_email = models.EmailField(blank=True)
    status = models.CharField(max_length=12, choices=STATUS_CHOICES, default=STATUS_PENDING)
    credits_cents = models.PositiveIntegerField(default=0)
    joined_date = models.DateTimeField(auto_now_add=True)
    activated_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-joined_date"]
        indexes = [
            models.Index(fields=["referrer", "status"]),
            models.Index(fields=["status"]),
        ]
        constraints = [
            models.CheckConstraint(
                condition=~Q(referrer=models.F("referred_user")),
                name="referral_referrer_diff_referred",
            ),
        ]

    def __str__(self):
        return f"ReferralInvite({self.referrer_id}->{self.referred_user_id}) {self.status} {self.credits_cents}"

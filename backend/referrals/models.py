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
    referrer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="referrals"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"ReferralProfile({self.user_id}) {self.referral_code}"

    @classmethod
    def generate_code(cls, prefix: str = "VFX", length: int = 7) -> str:
        alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
        while True:
            token = "".join(secrets.choice(alphabet) for _ in range(length))
            code = f"{prefix}-{token}"

            if not cls.objects.filter(referral_code=code).exists():
                return code



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
    commission_eligible = models.BooleanField(default=False)
    referral_level = models.PositiveSmallIntegerField(default=1)
    referral_code_used = models.CharField(max_length=24, blank=True)
    joined_date = models.DateTimeField(auto_now_add=True)
    activated_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-joined_date"]
        indexes = [
            models.Index(fields=["referrer", "status"]),
            models.Index(fields=["referrer", "status", "commission_eligible"]),
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


class ReferralCommission(models.Model):
    beneficiary = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="referral_commissions",
    )
    source_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="generated_referral_commissions",
    )
    source_investment = models.ForeignKey(
        "portfolio.Investment",
        on_delete=models.CASCADE,
        related_name="referral_commissions",
    )
    source_invite = models.ForeignKey(
        "referrals.ReferralInvite",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="commissions_generated",
    )
    level = models.PositiveSmallIntegerField()
    percent_bp = models.PositiveSmallIntegerField()
    amount_cents = models.PositiveIntegerField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["beneficiary", "created_at"]),
            models.Index(fields=["source_user", "created_at"]),
        ]
        constraints = [
            models.CheckConstraint(condition=Q(level__gte=1) & Q(level__lte=3), name="referral_commission_level_1_3"),
            models.CheckConstraint(condition=Q(amount_cents__gt=0), name="referral_commission_amount_positive"),
            models.UniqueConstraint(
                fields=["source_investment", "beneficiary"],
                name="uniq_referral_commission_investment_beneficiary",
            ),
        ]

    def __str__(self):
        return f"ReferralCommission(inv={self.source_investment_id}, user={self.beneficiary_id}, lvl={self.level}, cents={self.amount_cents})"

from django.conf import settings
from django.db import models
from django.db.models import Q


class WithdrawalRequest(models.Model):
    TYPE_RESULT_SETTLEMENT = "RESULT_SETTLEMENT"
    TYPE_CAPITAL_REDEMPTION = "CAPITAL_REDEMPTION"
    TYPE_CHOICES = [
        (TYPE_RESULT_SETTLEMENT, "Liquidacao de resultado"),
        (TYPE_CAPITAL_REDEMPTION, "Resgate de capital"),
    ]

    STATUS_PENDING = "PENDING"
    STATUS_APPROVED = "APPROVED"
    STATUS_REJECTED = "REJECTED"
    STATUS_PAID = "PAID"
    STATUS_CHOICES = [
        (STATUS_PENDING, "Pendente"),
        (STATUS_APPROVED, "Aprovado"),
        (STATUS_REJECTED, "Rejeitado"),
        (STATUS_PAID, "Pago"),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="withdrawal_requests",
    )
    withdrawal_type = models.CharField(max_length=24, choices=TYPE_CHOICES)
    amount_cents = models.PositiveIntegerField()
    pix_key = models.CharField(max_length=140, blank=True)
    scheduled_for = models.DateField(null=True, blank=True)

    status = models.CharField(max_length=12, choices=STATUS_CHOICES, default=STATUS_PENDING)
    rejection_reason = models.CharField(max_length=255, blank=True)
    admin_note = models.TextField(blank=True)
    external_ref = models.CharField(max_length=80, null=True, blank=True)

    requested_at = models.DateTimeField(auto_now_add=True)
    approved_at = models.DateTimeField(null=True, blank=True)
    paid_at = models.DateTimeField(null=True, blank=True)
    processed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="processed_withdrawals",
    )

    class Meta:
        ordering = ["-requested_at"]
        indexes = [
            models.Index(fields=["user", "status"]),
            models.Index(fields=["user", "withdrawal_type", "status"]),
            models.Index(fields=["user", "withdrawal_type", "scheduled_for"]),
            models.Index(fields=["status"]),
        ]

    def __str__(self):
        return f"Withdrawal({self.user_id}) {self.withdrawal_type} {self.amount_cents} {self.status}"


class ResultLedgerEntry(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="result_ledger_entries",
    )
    amount_cents = models.IntegerField()
    description = models.CharField(max_length=255, blank=True)
    external_ref = models.CharField(max_length=80, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_result_entries",
    )

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "created_at"]),
        ]
        constraints = [
            models.CheckConstraint(
                condition=~Q(amount_cents=0),
                name="result_ledger_amount_non_zero",
            ),
        ]

    def __str__(self):
        return f"ResultLedgerEntry({self.user_id}) {self.amount_cents}"


class DailyPerformanceDistribution(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="daily_performance_distributions",
    )
    reference_date = models.DateField()
    performance_percent = models.DecimalField(max_digits=7, decimal_places=4)
    base_capital_cents = models.PositiveIntegerField()
    result_cents = models.IntegerField()
    note = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_daily_performance_distributions",
    )

    class Meta:
        ordering = ["-reference_date", "-created_at"]
        indexes = [
            models.Index(fields=["reference_date"]),
            models.Index(fields=["user", "reference_date"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["user", "reference_date"],
                name="uniq_daily_performance_per_user_date",
            ),
        ]

    def __str__(self):
        return f"DailyPerf({self.user_id}) {self.reference_date} {self.result_cents}"

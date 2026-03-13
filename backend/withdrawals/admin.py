from django.contrib import admin

from .models import DailyPerformanceDistribution, ResultLedgerEntry, WithdrawalRequest


@admin.register(WithdrawalRequest)
class WithdrawalRequestAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "user",
        "withdrawal_type",
        "amount_cents",
        "status",
        "requested_at",
        "approved_at",
        "paid_at",
    )
    list_filter = ("withdrawal_type", "status", "requested_at")
    search_fields = ("user__username", "user__email", "external_ref", "pix_key")


@admin.register(ResultLedgerEntry)
class ResultLedgerEntryAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "amount_cents", "description", "created_at", "created_by")
    list_filter = ("created_at",)
    search_fields = ("user__username", "user__email", "description", "external_ref")


@admin.register(DailyPerformanceDistribution)
class DailyPerformanceDistributionAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "user",
        "reference_date",
        "performance_percent",
        "base_capital_cents",
        "result_cents",
        "created_at",
    )
    list_filter = ("reference_date", "created_at")
    search_fields = ("user__username", "user__email", "note")

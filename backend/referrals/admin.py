from django.contrib import admin

from .models import ReferralCommission, ReferralInvite, ReferralProfile


@admin.register(ReferralProfile)
class ReferralProfileAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "referral_code", "created_at")
    search_fields = ("user__username", "user__email", "referral_code")
    list_select_related = ("user",)


@admin.register(ReferralInvite)
class ReferralInviteAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "referrer",
        "referred_user",
        "referred_email",
        "status",
        "commission_eligible",
        "referral_level",
        "credits_cents",
        "joined_date",
        "activated_at",
    )
    list_filter = ("status", "commission_eligible", "joined_date")
    search_fields = (
        "referrer__username",
        "referrer__email",
        "referred_user__username",
        "referred_email",
        "referred_name",
        "referral_code_used",
    )
    list_select_related = ("referrer", "referred_user")


@admin.register(ReferralCommission)
class ReferralCommissionAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "beneficiary",
        "source_user",
        "source_investment",
        "level",
        "percent_bp",
        "amount_cents",
        "created_at",
    )
    list_filter = ("level", "created_at")
    search_fields = (
        "beneficiary__username",
        "beneficiary__email",
        "source_user__username",
        "source_user__email",
        "source_investment__id",
    )
    list_select_related = ("beneficiary", "source_user", "source_investment", "source_invite")

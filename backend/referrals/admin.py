from django.contrib import admin

from .models import ReferralInvite, ReferralProfile


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
        "credits_cents",
        "joined_date",
        "activated_at",
    )
    list_filter = ("status", "joined_date")
    search_fields = (
        "referrer__username",
        "referrer__email",
        "referred_user__username",
        "referred_email",
        "referred_name",
    )
    list_select_related = ("referrer", "referred_user")

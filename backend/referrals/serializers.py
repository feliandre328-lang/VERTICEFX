from decimal import Decimal

from django.contrib.auth import get_user_model
from django.db import IntegrityError
from django.db.models import Sum
from django.utils import timezone
from rest_framework import serializers

from .models import ReferralCommission, ReferralInvite, ReferralProfile
from .services import (
    MAX_COMMISSION_INVITES,
    MULTILEVEL_COMMISSION_RATES_BP,
    ensure_referral_profile,
    get_referral_slots_used,
)


User = get_user_model()


class ReferralInviteSerializer(serializers.ModelSerializer):
    referred_username = serializers.CharField(source="referred_user.username", read_only=True)
    referrer_username = serializers.CharField(source="referrer.username", read_only=True)
    referrer_email = serializers.CharField(source="referrer.email", read_only=True)

    class Meta:
        model = ReferralInvite
        fields = [
            "id",
            "referrer",
            "referrer_username",
            "referrer_email",
            "referred_user",
            "referred_username",
            "referred_name",
            "referred_email",
            "status",
            "credits_cents",
            "commission_eligible",
            "referral_level",
            "referral_code_used",
            "joined_date",
            "activated_at",
        ]
        read_only_fields = [
            "id",
            "referrer",
            "referrer_username",
            "referrer_email",
            "status",
            "credits_cents",
            "commission_eligible",
            "referral_level",
            "referral_code_used",
            "joined_date",
            "activated_at",
            "referred_username",
        ]


class ReferralInviteCreateSerializer(serializers.Serializer):
    referred_name = serializers.CharField(max_length=120, required=False, allow_blank=True)
    referred_email = serializers.EmailField(required=False, allow_blank=True)

    def validate(self, attrs):
        name = (attrs.get("referred_name") or "").strip()
        email = (attrs.get("referred_email") or "").strip().lower()
        if not name and not email:
            raise serializers.ValidationError("Informe pelo menos nome ou e-mail do indicado.")

        request = self.context["request"]
        if email and request.user.email and email == request.user.email.lower():
            raise serializers.ValidationError({"referred_email": "Nao e permitido indicar o proprio e-mail."})

        duplicate_qs = ReferralInvite.objects.filter(referrer=request.user, status=ReferralInvite.STATUS_PENDING)
        if email:
            duplicate_qs = duplicate_qs.filter(referred_email__iexact=email)
        elif name:
            duplicate_qs = duplicate_qs.filter(referred_name__iexact=name)
        if duplicate_qs.exists():
            raise serializers.ValidationError("Ja existe indicacao pendente com estes dados.")

        attrs["referred_name"] = name
        attrs["referred_email"] = email
        return attrs

    def create(self, validated_data):
        return ReferralInvite.objects.create(referrer=self.context["request"].user, **validated_data)


class ReferralSummarySerializer(serializers.Serializer):
    referral_code = serializers.CharField()
    active_referrals_count = serializers.IntegerField()
    pending_referrals_count = serializers.IntegerField()
    total_credits_cents = serializers.IntegerField()
    level_1_credits_cents = serializers.IntegerField()
    level_2_credits_cents = serializers.IntegerField()
    level_3_credits_cents = serializers.IntegerField()
    commission_invites_limit = serializers.IntegerField()
    commission_invites_used = serializers.IntegerField()
    commission_invites_remaining = serializers.IntegerField()
    commission_rates = serializers.DictField()
    current_tier = serializers.DictField()
    next_tier = serializers.DictField(allow_null=True)
    credits_to_next_cents = serializers.IntegerField()
    active_to_next = serializers.IntegerField()

    @staticmethod
    def build_for_user(user):
        profile = ReferralProfile.objects.filter(user=user).first()
        if profile is None:
            try:
                profile = ensure_referral_profile(user)
            except IntegrityError as exc:
                raise serializers.ValidationError("Nao foi possivel gerar codigo de indicacao.") from exc

        qs = ReferralInvite.objects.filter(referrer=user)
        active_count = qs.filter(status=ReferralInvite.STATUS_ACTIVE).count()
        pending_count = qs.filter(status=ReferralInvite.STATUS_PENDING).count()
        total_credits_cents = ReferralCommission.objects.filter(beneficiary=user).aggregate(s=Sum("amount_cents"))["s"] or 0
        level_1_credits_cents = (
            ReferralCommission.objects.filter(beneficiary=user, level=1).aggregate(s=Sum("amount_cents"))["s"] or 0
        )
        level_2_credits_cents = (
            ReferralCommission.objects.filter(beneficiary=user, level=2).aggregate(s=Sum("amount_cents"))["s"] or 0
        )
        level_3_credits_cents = (
            ReferralCommission.objects.filter(beneficiary=user, level=3).aggregate(s=Sum("amount_cents"))["s"] or 0
        )
        slots_used = get_referral_slots_used(user)
        slots_remaining = max(MAX_COMMISSION_INVITES - slots_used, 0)

        tier_rules = [
            {"name": "Start", "min_credits_cents": 0, "min_active": 0, "fee_discount": "0%", "bonus_report": "Mensal"},
            {"name": "Prime", "min_credits_cents": 50000, "min_active": 2, "fee_discount": "5%", "bonus_report": "Semanal"},
            {"name": "Elite", "min_credits_cents": 150000, "min_active": 5, "fee_discount": "10%", "bonus_report": "Diario"},
        ]

        current_tier = tier_rules[0]
        for tier in tier_rules:
            if total_credits_cents >= tier["min_credits_cents"] and active_count >= tier["min_active"]:
                current_tier = tier

        current_idx = next((i for i, t in enumerate(tier_rules) if t["name"] == current_tier["name"]), 0)
        next_tier = tier_rules[current_idx + 1] if current_idx + 1 < len(tier_rules) else None

        credits_to_next = 0
        active_to_next = 0
        if next_tier:
            credits_to_next = max(next_tier["min_credits_cents"] - total_credits_cents, 0)
            active_to_next = max(next_tier["min_active"] - active_count, 0)

        return {
            "referral_code": profile.referral_code,
            "active_referrals_count": active_count,
            "pending_referrals_count": pending_count,
            "total_credits_cents": total_credits_cents,
            "level_1_credits_cents": level_1_credits_cents,
            "level_2_credits_cents": level_2_credits_cents,
            "level_3_credits_cents": level_3_credits_cents,
            "commission_invites_limit": MAX_COMMISSION_INVITES,
            "commission_invites_used": slots_used,
            "commission_invites_remaining": slots_remaining,
            "commission_rates": {
                "level_1_percent": MULTILEVEL_COMMISSION_RATES_BP[1] / 100,
                "level_2_percent": MULTILEVEL_COMMISSION_RATES_BP[2] / 100,
                "level_3_percent": MULTILEVEL_COMMISSION_RATES_BP[3] / 100,
            },
            "current_tier": current_tier,
            "next_tier": next_tier,
            "credits_to_next_cents": credits_to_next,
            "active_to_next": active_to_next,
        }


class ReferralCodeResolveSerializer(serializers.Serializer):
    code = serializers.CharField()
    referrer = serializers.DictField()
    commission_invites_limit = serializers.IntegerField()
    commission_invites_used = serializers.IntegerField()
    commission_invites_remaining = serializers.IntegerField()
    commission_rates = serializers.DictField()


class AdminReferralActivateSerializer(serializers.Serializer):
    invite_id = serializers.PrimaryKeyRelatedField(queryset=ReferralInvite.objects.all(), source="invite")
    referred_user = serializers.PrimaryKeyRelatedField(queryset=User.objects.all(), required=False, allow_null=True)
    credits = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, default=Decimal("50.00"))

    def validate_credits(self, value):
        if value <= 0:
            raise serializers.ValidationError("credits deve ser maior que zero.")
        return value

    def save(self, **kwargs):
        invite: ReferralInvite = self.validated_data["invite"]
        referred_user = self.validated_data.get("referred_user")
        credits = self.validated_data["credits"]
        credits_cents = int((credits * 100).quantize(Decimal("1")))

        if referred_user and referred_user == invite.referrer:
            raise serializers.ValidationError({"referred_user": "Referred user nao pode ser o proprio referrer."})

        was_active = invite.status == ReferralInvite.STATUS_ACTIVE and invite.activated_at is not None

        invite.status = ReferralInvite.STATUS_ACTIVE
        if not was_active:
            invite.activated_at = timezone.now()
        invite.credits_cents = credits_cents
        if not was_active:
            active_count = (
                ReferralInvite.objects.filter(referrer=invite.referrer, status=ReferralInvite.STATUS_ACTIVE)
                .exclude(id=invite.id)
                .count()
            )
            eligible_count = (
                ReferralInvite.objects.filter(
                    referrer=invite.referrer,
                    status=ReferralInvite.STATUS_ACTIVE,
                    commission_eligible=True,
                )
                .exclude(id=invite.id)
                .count()
            )
            invite.referral_level = active_count + 1
            invite.commission_eligible = eligible_count < MAX_COMMISSION_INVITES
        ref_profile = ensure_referral_profile(invite.referrer)
        if not invite.referral_code_used:
            invite.referral_code_used = ref_profile.referral_code
        if referred_user:
            invite.referred_user = referred_user
            if not invite.referred_name:
                invite.referred_name = referred_user.username
            if not invite.referred_email:
                invite.referred_email = referred_user.email or ""
            referred_profile = ensure_referral_profile(referred_user)
            if referred_profile.referrer_id not in (None, invite.referrer_id):
                raise serializers.ValidationError({"referred_user": "Este cadastro ja esta vinculado a outro convite."})
            if referred_profile.referrer_id != invite.referrer_id:
                referred_profile.referrer = invite.referrer
                referred_profile.save(update_fields=["referrer"])
        invite.save(
            update_fields=[
                "status",
                "activated_at",
                "credits_cents",
                "referral_level",
                "commission_eligible",
                "referred_user",
                "referred_name",
                "referred_email",
                "referral_code_used",
            ]
        )
        return invite

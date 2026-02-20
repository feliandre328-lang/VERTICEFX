from decimal import Decimal

from django.contrib.auth import get_user_model
from django.db import IntegrityError
from django.db.models import Sum
from django.utils import timezone
from rest_framework import serializers

from .models import ReferralInvite, ReferralProfile


User = get_user_model()


class ReferralInviteSerializer(serializers.ModelSerializer):
    referred_username = serializers.CharField(source="referred_user.username", read_only=True)

    class Meta:
        model = ReferralInvite
        fields = [
            "id",
            "referred_user",
            "referred_username",
            "referred_name",
            "referred_email",
            "status",
            "credits_cents",
            "joined_date",
            "activated_at",
        ]
        read_only_fields = ["id", "status", "credits_cents", "joined_date", "activated_at", "referred_username"]


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
    current_tier = serializers.DictField()
    next_tier = serializers.DictField(allow_null=True)
    credits_to_next_cents = serializers.IntegerField()
    active_to_next = serializers.IntegerField()

    @staticmethod
    def build_for_user(user):
        profile = ReferralProfile.objects.filter(user=user).first()
        if profile is None:
            for _ in range(10):
                try:
                    profile = ReferralProfile.objects.create(user=user, referral_code=ReferralProfile.generate_code())
                    break
                except IntegrityError:
                    continue
            if profile is None:
                raise serializers.ValidationError("Nao foi possivel gerar codigo de indicacao.")

        qs = ReferralInvite.objects.filter(referrer=user)
        active_count = qs.filter(status=ReferralInvite.STATUS_ACTIVE).count()
        pending_count = qs.filter(status=ReferralInvite.STATUS_PENDING).count()
        total_credits_cents = qs.aggregate(s=Sum("credits_cents"))["s"] or 0

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
            "current_tier": current_tier,
            "next_tier": next_tier,
            "credits_to_next_cents": credits_to_next,
            "active_to_next": active_to_next,
        }


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

        invite.status = ReferralInvite.STATUS_ACTIVE
        invite.activated_at = timezone.now()
        invite.credits_cents = credits_cents
        if referred_user:
            invite.referred_user = referred_user
            if not invite.referred_name:
                invite.referred_name = referred_user.username
            if not invite.referred_email:
                invite.referred_email = referred_user.email or ""
        invite.save(
            update_fields=["status", "activated_at", "credits_cents", "referred_user", "referred_name", "referred_email"]
        )
        return invite

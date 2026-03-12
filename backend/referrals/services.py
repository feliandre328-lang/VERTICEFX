import re
from decimal import Decimal, ROUND_HALF_UP
from typing import Optional

from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction
from django.db.models import F, Q
from django.utils import timezone

from notifications.models import Notification
from notifications.services import create_notification
from withdrawals.models import ResultLedgerEntry

from .models import ReferralCommission, ReferralInvite, ReferralProfile


User = get_user_model()

MAX_COMMISSION_INVITES = 3  # quantidade maxima de indicacoes diretas com comissao
MULTILEVEL_COMMISSION_RATES_BP = {
    1: 500,  # 5% - 1a indicacao
    2: 300,  # 3% - 2a indicacao
    3: 200,  # 2% - 3a indicacao
}
REFERRAL_CODE_RE = re.compile(r"^VFX-(\d+)$", re.IGNORECASE)


def build_public_referral_code(user_id: int) -> str:
    return f"VFX-{int(user_id)}"


def normalize_referral_code(code: str | None) -> str:
    return str(code or "").strip().upper()


def ensure_referral_profile(user) -> ReferralProfile:
    profile = ReferralProfile.objects.filter(user=user).first()
    if profile:
        return profile

    for _ in range(10):
        code = ReferralProfile.generate_code()
        try:
            return ReferralProfile.objects.create(user=user, referral_code=code)
        except IntegrityError:
            continue
    raise IntegrityError("Nao foi possivel gerar um codigo de indicacao unico.")


def resolve_referrer_by_code(code: str | None):
    normalized = normalize_referral_code(code)
    if not normalized:
        return None

    profile = ReferralProfile.objects.select_related("user").filter(referral_code__iexact=normalized).first()
    if profile and getattr(profile.user, "is_active", True):
        return profile.user

    numeric_match = REFERRAL_CODE_RE.match(normalized)
    if numeric_match:
        user_id = int(numeric_match.group(1))
        by_id = User.objects.filter(id=user_id, is_active=True).first()
        if by_id:
            return by_id

    return None


def get_referral_slots_used(user) -> int:
    return (
        ReferralInvite.objects.filter(
            referrer=user,
            status=ReferralInvite.STATUS_ACTIVE,
            referred_user__isnull=False,
            commission_eligible=True,
        ).count()
    )


def attach_referral_on_signup(user, referral_code: str | None) -> Optional[ReferralInvite]:
    normalized = normalize_referral_code(referral_code)
    if not normalized:
        return None

    referrer = resolve_referrer_by_code(normalized)
    if not referrer:
        raise ValueError("Codigo de convite invalido.")
    if referrer.id == user.id:
        raise ValueError("Nao e permitido usar o proprio codigo de convite.")

    ensure_referral_profile(referrer)

    with transaction.atomic():
        # Serializa anexos de convite do mesmo referrer para fixar a ordem das indicacoes.
        User.objects.select_for_update().filter(id=referrer.id).first()

        invite = ReferralInvite.objects.select_for_update().filter(referred_user=user).first()
        if invite and invite.referrer_id != referrer.id:
            raise ValueError("Este cadastro ja esta vinculado a outro convite.")

        def _counts(exclude_id=None):
            base = ReferralInvite.objects.filter(referrer=referrer, status=ReferralInvite.STATUS_ACTIVE)
            if exclude_id:
                base = base.exclude(id=exclude_id)
            active_count = base.count()
            eligible_count = base.filter(commission_eligible=True).count()
            return active_count, eligible_count

        if not invite:
            active_count, eligible_count = _counts()
            referral_level = active_count + 1
            commission_eligible = eligible_count < MAX_COMMISSION_INVITES
            invite = ReferralInvite.objects.create(
                referrer=referrer,
                referred_user=user,
                referred_name=getattr(user, "username", "") or "",
                referred_email=getattr(user, "email", "") or "",
                status=ReferralInvite.STATUS_ACTIVE,
                activated_at=timezone.now(),
                commission_eligible=commission_eligible,
                referral_level=referral_level,
                referral_code_used=normalized,
            )
        else:
            if invite.status != ReferralInvite.STATUS_ACTIVE or not invite.activated_at:
                active_count, eligible_count = _counts(exclude_id=invite.id)
                invite.referral_level = active_count + 1
                invite.commission_eligible = eligible_count < MAX_COMMISSION_INVITES
                invite.status = ReferralInvite.STATUS_ACTIVE
                invite.activated_at = timezone.now()
            invite.referred_name = invite.referred_name or getattr(user, "username", "") or ""
            invite.referred_email = invite.referred_email or getattr(user, "email", "") or ""
            invite.referral_code_used = invite.referral_code_used or normalized
            invite.save(
                update_fields=[
                    "referred_name",
                    "referred_email",
                    "status",
                    "activated_at",
                    "commission_eligible",
                    "referral_level",
                    "referral_code_used",
                ]
            )

        referred_profile = ensure_referral_profile(user)
        if referred_profile.referrer_id not in (None, referrer.id):
            raise ValueError("Este cadastro ja esta vinculado a outro convite.")
        if referred_profile.referrer_id != referrer.id:
            referred_profile.referrer = referrer
            referred_profile.save(update_fields=["referrer"])
        return invite


def _calc_commission_cents(amount_cents: int, bp: int) -> int:
    amount = Decimal(int(amount_cents))
    fraction = Decimal(int(bp)) / Decimal("10000")
    return int((amount * fraction).quantize(Decimal("1"), rounding=ROUND_HALF_UP))


def _resolve_invite_order(edge: ReferralInvite) -> int:
    if not edge or not edge.referrer_id:
        return 0
    qs = ReferralInvite.objects.filter(referrer=edge.referrer, status=ReferralInvite.STATUS_ACTIVE)
    if edge.activated_at:
        earlier = qs.filter(
            Q(activated_at__lt=edge.activated_at) | Q(activated_at=edge.activated_at, id__lt=edge.id)
        ).count()
    else:
        earlier = qs.filter(id__lt=edge.id).count()
    return earlier + 1


def register_commissions_for_approved_investment(investment, approved_by=None):
    if not investment or getattr(investment, "status", "") != "APPROVED":
        return []

    amount_cents = int(getattr(investment, "amount_cents", 0) or 0)
    if amount_cents <= 0:
        return []

    edge = (
        ReferralInvite.objects.select_related("referrer")
        .filter(referred_user=investment.user, status=ReferralInvite.STATUS_ACTIVE)
        .order_by("-activated_at", "-joined_date")
        .first()
    )
    if not edge:
        return []

    created_commissions = []
    with transaction.atomic():
        beneficiary = edge.referrer
        if not beneficiary or beneficiary.id == investment.user_id:
            return []

        level = _resolve_invite_order(edge)
        commission_eligible = level <= MAX_COMMISSION_INVITES
        if edge.referral_level != level or edge.commission_eligible != commission_eligible:
            ReferralInvite.objects.filter(id=edge.id).update(
                referral_level=level,
                commission_eligible=commission_eligible,
            )
        if not commission_eligible:
            return []

        percent_bp = MULTILEVEL_COMMISSION_RATES_BP.get(level)
        if not percent_bp:
            return []

        commission_cents = _calc_commission_cents(amount_cents, percent_bp)
        if commission_cents <= 0:
            return []

        commission, created = ReferralCommission.objects.get_or_create(
            source_investment=investment,
            beneficiary=beneficiary,
            defaults={
                "source_user": investment.user,
                "source_invite": edge,
                "level": level,
                "percent_bp": percent_bp,
                "amount_cents": commission_cents,
            },
        )
        if not created:
            return []

        ResultLedgerEntry.objects.create(
            user=beneficiary,
            amount_cents=commission_cents,
            description=(
                f"Comissao de indicacao nivel {level} do aporte #{investment.id} "
                f"de {investment.user.username}"
            ),
            external_ref=f"ref-comm-{investment.id}-{beneficiary.id}",
            created_by=approved_by,
        )

        ReferralInvite.objects.filter(id=edge.id).update(credits_cents=F("credits_cents") + commission_cents)

        create_notification(
            user=beneficiary,
            category=Notification.CATEGORY_SYSTEM,
            title="Comissao de indicacao creditada",
            message=f"Voce recebeu R$ {Decimal(commission_cents) / Decimal('100'):.2f} no nivel {level}.",
            payload={
                "investment_id": investment.id,
                "source_user_id": investment.user_id,
                "level": level,
                "amount_cents": commission_cents,
            },
        )

        created_commissions.append(commission)

    return created_commissions

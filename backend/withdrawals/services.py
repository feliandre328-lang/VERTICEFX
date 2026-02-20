from datetime import date

from django.db.utils import OperationalError, ProgrammingError
from django.db.models import Q, Sum
from django.utils import timezone

from portfolio.models import Investment
from .models import ResultLedgerEntry, WithdrawalRequest


RESERVED_WITHDRAWAL_STATUSES = [
    WithdrawalRequest.STATUS_PENDING,
    WithdrawalRequest.STATUS_APPROVED,
    WithdrawalRequest.STATUS_PAID,
]


def get_user_withdrawal_balances(user, reference_date: date | None = None):
    capital_cutoff_date = reference_date or timezone.localdate()

    try:
        approved_capital_cents = (
            Investment.objects.filter(user=user, status=Investment.STATUS_APPROVED)
            .filter(
                Q(paid_at__date__lte=capital_cutoff_date)
                | Q(paid_at__isnull=True, created_at__date__lte=capital_cutoff_date)
            )
            .aggregate(s=Sum("amount_cents"))["s"]
            or 0
        )

        capital_reserved_cents = (
            WithdrawalRequest.objects.filter(
                user=user,
                withdrawal_type=WithdrawalRequest.TYPE_CAPITAL_REDEMPTION,
                status__in=RESERVED_WITHDRAWAL_STATUSES,
            )
            .filter(Q(scheduled_for__lte=capital_cutoff_date) | Q(scheduled_for__isnull=True))
            .aggregate(s=Sum("amount_cents"))["s"]
            or 0
        )

        result_ledger_cents = (
            ResultLedgerEntry.objects.filter(user=user, created_at__date__lte=capital_cutoff_date).aggregate(
                s=Sum("amount_cents")
            )["s"]
            or 0
        )

        result_reserved_cents = (
            WithdrawalRequest.objects.filter(
                user=user,
                withdrawal_type=WithdrawalRequest.TYPE_RESULT_SETTLEMENT,
                status__in=RESERVED_WITHDRAWAL_STATUSES,
                requested_at__date__lte=capital_cutoff_date,
            ).aggregate(s=Sum("amount_cents"))["s"]
            or 0
        )

        pending_capital_cents = (
            WithdrawalRequest.objects.filter(
                user=user,
                withdrawal_type=WithdrawalRequest.TYPE_CAPITAL_REDEMPTION,
                status=WithdrawalRequest.STATUS_PENDING,
            ).aggregate(s=Sum("amount_cents"))["s"]
            or 0
        )

        pending_result_cents = (
            WithdrawalRequest.objects.filter(
                user=user,
                withdrawal_type=WithdrawalRequest.TYPE_RESULT_SETTLEMENT,
                status=WithdrawalRequest.STATUS_PENDING,
            ).aggregate(s=Sum("amount_cents"))["s"]
            or 0
        )
    except (OperationalError, ProgrammingError):
        approved_capital_cents = 0
        capital_reserved_cents = 0
        result_ledger_cents = 0
        result_reserved_cents = 0
        pending_capital_cents = 0
        pending_result_cents = 0

    available_capital_cents = max(
        approved_capital_cents + result_ledger_cents - capital_reserved_cents - result_reserved_cents,
        0,
    )
    available_result_cents = max(result_ledger_cents - result_reserved_cents, 0)

    return {
        "available_capital_cents": available_capital_cents,
        "available_result_cents": available_result_cents,
        "approved_capital_cents": approved_capital_cents,
        "result_ledger_cents": result_ledger_cents,
        "pending_capital_cents": pending_capital_cents,
        "pending_result_cents": pending_result_cents,
        "capital_cutoff_date": capital_cutoff_date.isoformat(),
    }

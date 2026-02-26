from datetime import date, timedelta

from django.db.utils import OperationalError, ProgrammingError
from django.db.models import Q, Sum
from django.utils import timezone

from portfolio.models import Investment
from .models import DailyPerformanceDistribution, WithdrawalRequest


RESERVED_WITHDRAWAL_STATUSES = [
    WithdrawalRequest.STATUS_PENDING,
    WithdrawalRequest.STATUS_APPROVED,
    WithdrawalRequest.STATUS_PAID,
]


def get_user_withdrawal_balances(user, reference_date: date | None = None):
    capital_cutoff_date = reference_date or timezone.localdate()
    liquid_capital_cutoff_date = capital_cutoff_date - timedelta(days=90)

    try:
        investments_total_cents = (
            Investment.objects.filter(user=user).aggregate(s=Sum("amount_cents"))["s"]
            or 0
        )

        approved_capital_cents = (
            Investment.objects.filter(user=user, status=Investment.STATUS_APPROVED)
            .filter(
                Q(paid_at__date__lte=capital_cutoff_date)
                | Q(paid_at__isnull=True, created_at__date__lte=capital_cutoff_date)
            )
            .aggregate(s=Sum("amount_cents"))["s"]
            or 0
        )

        liquid_capital_cents = (
            Investment.objects.filter(user=user, status=Investment.STATUS_APPROVED)
            .filter(
                Q(paid_at__date__lte=liquid_capital_cutoff_date)
                | Q(paid_at__isnull=True, created_at__date__lte=liquid_capital_cutoff_date)
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

        # Reserva total sem corte de data (usado por telas consolidadas como dashboard).
        capital_reserved_total_cents = (
            WithdrawalRequest.objects.filter(
                user=user,
                withdrawal_type=WithdrawalRequest.TYPE_CAPITAL_REDEMPTION,
                status__in=RESERVED_WITHDRAWAL_STATUSES,
            ).aggregate(s=Sum("amount_cents"))["s"]
            or 0
        )

        daily_distribution_total_cents = (
            DailyPerformanceDistribution.objects.filter(user=user).aggregate(s=Sum("result_cents"))["s"]
            or 0
        )

        result_ledger_cents = (
            DailyPerformanceDistribution.objects.filter(user=user, reference_date__lte=capital_cutoff_date).aggregate(
                s=Sum("result_cents")
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

        # Reserva total sem corte de data (usado por telas consolidadas como dashboard).
        result_reserved_total_cents = (
            WithdrawalRequest.objects.filter(
                user=user,
                withdrawal_type=WithdrawalRequest.TYPE_RESULT_SETTLEMENT,
                status__in=RESERVED_WITHDRAWAL_STATUSES,
            ).aggregate(s=Sum("amount_cents"))["s"]
            or 0
        )

        withdrawals_total_cents = (
            WithdrawalRequest.objects.filter(user=user).aggregate(s=Sum("amount_cents"))["s"]
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
        investments_total_cents = 0
        approved_capital_cents = 0
        liquid_capital_cents = 0
        capital_reserved_cents = 0
        capital_reserved_total_cents = 0
        daily_distribution_total_cents = 0
        result_ledger_cents = 0
        result_reserved_cents = 0
        result_reserved_total_cents = 0
        withdrawals_total_cents = 0
        pending_capital_cents = 0
        pending_result_cents = 0

    # CAPITAL: só pode resgatar aportes com mais de 90 dias (por aporte), na data de referência,
    # descontando o que já está reservado por solicitações.
    available_capital_cents = max(liquid_capital_cents - capital_reserved_cents, 0)
    available_result_cents = max(result_ledger_cents - result_reserved_cents, 0)
    statement_net_cents = investments_total_cents + daily_distribution_total_cents - withdrawals_total_cents

    return {
        "available_capital_cents": available_capital_cents,
        "available_result_cents": available_result_cents,
        "investments_total_cents": investments_total_cents,
        "approved_capital_cents": approved_capital_cents,
        "liquid_capital_cents": liquid_capital_cents,
        "capital_reserved_cents": capital_reserved_cents,
        "capital_reserved_total_cents": capital_reserved_total_cents,
        "daily_distribution_total_cents": daily_distribution_total_cents,
        "result_ledger_cents": result_ledger_cents,
        "result_reserved_cents": result_reserved_cents,
        "result_reserved_total_cents": result_reserved_total_cents,
        "withdrawals_total_cents": withdrawals_total_cents,
        "statement_net_cents": statement_net_cents,
        "pending_capital_cents": pending_capital_cents,
        "pending_result_cents": pending_result_cents,
        "capital_cutoff_date": capital_cutoff_date.isoformat(),
    }

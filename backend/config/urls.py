from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView

from portfolio.views import (
    InvestmentViewSet,
    AdminInvestmentViewSet,
    PixChargeView,
    DashboardSummaryView,
    AdminSummaryView,
)
from withdrawals.views import (
    AdminWithdrawalViewSet,
    ClientDailyPerformanceDistributionViewSet,
    ClientWithdrawalViewSet,
    DailyPerformanceDistributionAdminViewSet,
    ResultLedgerAdminViewSet,
    WithdrawalSummaryView,
)
from referrals.views import (
    AdminReferralInviteViewSet,
    ClientReferralInviteViewSet,
    ReferralSummaryView,
)
from notifications.views import NotificationViewSet

from portfolio.auth_views import MeView

router = DefaultRouter()
router.register("investments", InvestmentViewSet, basename="investment")
router.register("admin/investments", AdminInvestmentViewSet, basename="admin-investments")
router.register("withdrawals", ClientWithdrawalViewSet, basename="withdrawals")
router.register("performance-distributions", ClientDailyPerformanceDistributionViewSet, basename="performance-distributions")
router.register("admin/withdrawals", AdminWithdrawalViewSet, basename="admin-withdrawals")
router.register("admin/result-ledger", ResultLedgerAdminViewSet, basename="admin-result-ledger")
router.register("admin/performance-distributions", DailyPerformanceDistributionAdminViewSet, basename="admin-performance-distributions")
router.register("referrals/invites", ClientReferralInviteViewSet, basename="referral-invites")
router.register("admin/referrals/invites", AdminReferralInviteViewSet, basename="admin-referral-invites")
router.register("notifications", NotificationViewSet, basename="notifications")

urlpatterns = [
    path("admin/", admin.site.urls),

    # JWT
    path("api/auth/token/", TokenObtainPairView.as_view()),
    path("api/auth/me/", MeView.as_view(), name="auth_me"),  # ✅ AQUI


    # PIX
    path("api/pix/charge/", PixChargeView.as_view()),

    # Summary
    path("api/dashboard/summary/", DashboardSummaryView.as_view()),
    path("api/admin/summary/", AdminSummaryView.as_view()),
    path("api/withdrawals/summary/", WithdrawalSummaryView.as_view()),
    path("api/referrals/summary/", ReferralSummaryView.as_view()),


    # API
    path("api/", include(router.urls)),

    #Sign up
    path("api/", include("accounts.urls")),
]

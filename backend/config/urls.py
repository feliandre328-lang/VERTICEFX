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

from portfolio.auth_views import MeView

router = DefaultRouter()
router.register("investments", InvestmentViewSet, basename="investment")
router.register("admin/investments", AdminInvestmentViewSet, basename="admin-investments")

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


    # API
    path("api/", include(router.urls)),
]

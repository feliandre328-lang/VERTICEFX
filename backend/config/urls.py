from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView

from portfolio.views import InvestmentViewSet, PixChargeView, DashboardSummaryView

router = DefaultRouter()
router.register("investments", InvestmentViewSet, basename="investment")

urlpatterns = [
    path("admin/", admin.site.urls),

    # JWT
    path("api/auth/token/", TokenObtainPairView.as_view()),

    # Dashboard summary
    path("api/dashboard/summary/", DashboardSummaryView.as_view()),

    # PIX
    path("api/pix/charge/", PixChargeView.as_view()),

    # API
    path("api/", include(router.urls)),
]

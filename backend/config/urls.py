from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from portfolio.views import AssetViewSet, TransactionViewSet

router = DefaultRouter()
router.register(r"assets", AssetViewSet, basename="assets")
router.register(r"transactions", TransactionViewSet, basename="transactions")

urlpatterns = [
    path("admin/", admin.site.urls),

    path("api/auth/token/", TokenObtainPairView.as_view()),
    path("api/auth/token/refresh/", TokenRefreshView.as_view()),

    path("api/", include(router.urls)),
]

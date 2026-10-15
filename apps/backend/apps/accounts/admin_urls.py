from django.urls import path

from apps.accounts.admin_views import AdminVerifyAuthView

urlpatterns = [
    path("auth/verify/", AdminVerifyAuthView.as_view(), name="admin-auth-verify"),
]

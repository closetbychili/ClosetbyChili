from django.urls import path

from apps.accounts.admin_views import AdminDashboardOverviewView, AdminVerifyAuthView

urlpatterns = [
    path("auth/verify/", AdminVerifyAuthView.as_view(), name="admin-auth-verify"),
    path("dashboard/overview/", AdminDashboardOverviewView.as_view(), name="admin-dashboard-overview"),
]


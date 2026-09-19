from django.urls import path

from apps.accounts.views import CurrentUserView

urlpatterns = [
    path("", CurrentUserView.as_view(), name="current-user"),
]

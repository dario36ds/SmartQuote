from django.urls import path

from .notifications import (
    NotificationListView,
    ReadAllNotificationsView,
    ReadNotificationView,
    ReminderSettingsView,
)

urlpatterns = [
    path("", NotificationListView.as_view(), name="notification-list"),
    path("settings/", ReminderSettingsView.as_view(), name="notification-settings"),
    path("read-all/", ReadAllNotificationsView.as_view(), name="notification-read-all"),
    path("<int:pk>/read/", ReadNotificationView.as_view(), name="notification-read"),
]

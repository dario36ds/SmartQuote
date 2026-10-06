from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import serializers
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Quote, QuoteNotification, QuoteReminderSettings
from .reminders import generate_due_reminders


class QuoteNotificationSerializer(serializers.ModelSerializer):
    can_remind = serializers.SerializerMethodField()

    def get_can_remind(self, notification):
        return bool(
            notification.status == QuoteNotification.REMINDER
            and notification.quote_id
            and notification.quote.status in [Quote.Status.SENT, Quote.Status.VIEWED]
        )

    class Meta:
        model = QuoteNotification
        fields = (
            "id", "quote", "status", "quote_title", "customer_name",
            "created_at", "read_at", "can_remind",
        )
        read_only_fields = fields


class NotificationListView(APIView):
    def get(self, request):
        generate_due_reminders(user=request.user)
        notifications = QuoteNotification.objects.filter(user=request.user).select_related("quote")
        return Response({
            "results": QuoteNotificationSerializer(notifications[:50], many=True).data,
            "unread_count": notifications.filter(read_at__isnull=True).count(),
        })


class ReadNotificationView(APIView):
    def post(self, request, pk):
        notification = get_object_or_404(QuoteNotification, pk=pk, user=request.user)
        QuoteNotification.objects.filter(pk=notification.pk, read_at__isnull=True).update(
            read_at=timezone.now(),
        )
        notification.refresh_from_db()
        return Response(QuoteNotificationSerializer(notification).data)


class ReadAllNotificationsView(APIView):
    def post(self, request):
        updated = QuoteNotification.objects.filter(
            user=request.user, read_at__isnull=True,
        ).update(read_at=timezone.now())
        return Response({"updated": updated})


class ReminderSettingsSerializer(serializers.ModelSerializer):
    after_days = serializers.IntegerField(min_value=1, max_value=365)

    class Meta:
        model = QuoteReminderSettings
        fields = ("enabled", "after_days")


class ReminderSettingsView(APIView):
    def get(self, request):
        preferences = QuoteReminderSettings.objects.filter(user=request.user).first()
        return Response(ReminderSettingsSerializer(preferences or QuoteReminderSettings()).data)

    def patch(self, request):
        # Validate before persisting a preferences row for this account.
        serializer = ReminderSettingsSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        preferences, _ = QuoteReminderSettings.objects.get_or_create(user=request.user)
        for field, value in serializer.validated_data.items():
            setattr(preferences, field, value)
        preferences.save(update_fields=list(serializer.validated_data))
        return Response(ReminderSettingsSerializer(preferences).data)

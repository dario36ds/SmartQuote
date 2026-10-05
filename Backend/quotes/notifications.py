from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import serializers
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import QuoteNotification


class QuoteNotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuoteNotification
        fields = (
            "id", "quote", "status", "quote_title", "customer_name",
            "created_at", "read_at",
        )
        read_only_fields = fields


class NotificationListView(APIView):
    def get(self, request):
        notifications = QuoteNotification.objects.filter(user=request.user)
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

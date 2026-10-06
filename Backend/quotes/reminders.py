from datetime import timedelta

from django.db import transaction
from django.utils import timezone

from .models import Quote, QuoteNotification, QuoteReminderSettings


def generate_due_reminders(*, user=None, now=None):
    """Persist one reminder per unanswered quote, also while its owner is offline."""
    now = now or timezone.now()
    candidates = Quote.objects.filter(
        status__in=[Quote.Status.SENT, Quote.Status.VIEWED],
        sent_at__lte=now - timedelta(days=1),
    ).exclude(notifications__status=QuoteNotification.REMINDER).select_related(
        "customer__user__quote_reminder_settings",
    )
    if user is not None:
        candidates = candidates.filter(customer__user=user)

    created_count = 0
    for candidate in candidates.iterator(chunk_size=200):
        try:
            preferences = candidate.customer.user.quote_reminder_settings
        except QuoteReminderSettings.DoesNotExist:
            preferences = QuoteReminderSettings()
        if not preferences.enabled or candidate.sent_at > now - timedelta(days=preferences.after_days):
            continue

        # Responses and deletion lock the same row, so a resolved quote cannot
        # acquire a new reminder and concurrent workers cannot duplicate it.
        with transaction.atomic():
            quote = Quote.objects.select_for_update().filter(
                pk=candidate.pk, status__in=[Quote.Status.SENT, Quote.Status.VIEWED],
                sent_at__lte=now - timedelta(days=preferences.after_days),
            ).first()
            if quote is None:
                continue
            _, created = QuoteNotification.objects.get_or_create(
                quote=quote, status=QuoteNotification.REMINDER,
                defaults={
                    "user_id": candidate.customer.user_id,
                    "quote_title": quote.title,
                    "customer_name": candidate.customer.name,
                    "created_at": now,
                },
            )
            created_count += int(created)
    return created_count

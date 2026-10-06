from django.db import transaction
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet
from rest_framework.views import APIView
from .models import Quote, QuoteNotification
from .serializers import QuoteSerializer
from rest_framework.permissions import AllowAny
from .serializers import PublicQuoteSerializer
from ai_service.services import (
    OllamaServiceError,
    generate_quote_text,
)
from accounts.models import CompanyProfile
from accounts.serializers import CompanyProfileSerializer


class QuoteViewSet(ModelViewSet):
    serializer_class = QuoteSerializer

    def get_queryset(self):
        queryset = (
            Quote.objects
            .filter(customer__user=self.request.user)
            .select_related("customer")
            .prefetch_related("items")
            .order_by("-created_at")
        )

        if self.action in ("update", "partial_update", "destroy", "publish"):
            queryset = queryset.select_for_update(of=("self",))

        return queryset

    def get_object(self):
        quote = super().get_object()

        if (
            self.action in ("update", "partial_update", "generate_text")
            and quote.status != Quote.Status.DRAFT
        ):
            raise ValidationError({
                "detail": (
                    "Solo i preventivi in bozza possono essere modificati "
                    "o rigenerati con AI."
                )
            })

        return quote

    @transaction.atomic
    def update(self, request, *args, **kwargs):
        return super().update(request, *args, **kwargs)

    @transaction.atomic
    def destroy(self, request, *args, **kwargs):
        return super().destroy(request, *args, **kwargs)
    
    @action(
        detail=True,
        methods=["post"],
        url_path="generate-text",
    )
    def generate_text(self, request, pk=None):
        quote = self.get_object()

        tone = request.data.get("tone", "professional")

        allowed_tones = {
            "professional",
            "friendly",
            "concise",
            "commercial",
        }

        if tone not in allowed_tones:
            return Response(
                {
                    "detail": "Tono non valido."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            generated_text = generate_quote_text(
                quote,
                tone,
            )
        except OllamaServiceError as exc:
            return Response(
                {
                    "detail": str(exc)
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        return Response({
            "generated_text": generated_text
        })

    @action(detail=True, methods=["post"])
    @transaction.atomic
    def publish(self, request, pk=None):
        quote = self.get_object()

        if quote.status != Quote.Status.DRAFT:
            return Response(
                {
                    "detail": "È possibile pubblicare solo un preventivo in bozza."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Share the lock used by profile edits to capture the saved company data.
        get_user_model().objects.select_for_update().get(pk=request.user.pk)
        profile = CompanyProfile.objects.filter(user=request.user).first()
        quote.company_profile_snapshot = dict(CompanyProfileSerializer(profile).data) if profile else {}
        quote.status = Quote.Status.SENT
        quote.sent_at = timezone.now()

        quote.save(
            update_fields=[
                "status",
                "sent_at",
                "company_profile_snapshot",
            ]
        )

        return Response(
            QuoteSerializer(
                quote,
                context={"request": request},
            ).data
        )

class PublicQuoteView(APIView):
    permission_classes = [AllowAny]

    @transaction.atomic
    def get(self, request, token):
        try:
            quote = (
                Quote.objects
                .select_for_update(of=("self",))
                .select_related("customer")
                .prefetch_related("items")
                .get(public_token=token)
            )
        except Quote.DoesNotExist:
            return Response(
                {"detail": "Preventivo non trovato."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if quote.status == Quote.Status.DRAFT:
            return Response(
                {"detail": "Preventivo non disponibile."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if quote.status == Quote.Status.SENT:
            quote.status = Quote.Status.VIEWED
            quote.viewed_at = timezone.now()

            quote.save(
                update_fields=[
                    "status",
                    "viewed_at",
                ]
            )

        return Response(
            PublicQuoteSerializer(quote).data
        )

class AcceptQuoteView(APIView):
    permission_classes = [AllowAny]

    @transaction.atomic
    def post(self, request, token):
        try:
            quote = Quote.objects.select_for_update(of=("self",)).select_related("customer").get(
                public_token=token
            )
        except Quote.DoesNotExist:
            return Response(
                {"detail": "Preventivo non trovato."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if quote.status not in (
            Quote.Status.SENT,
            Quote.Status.VIEWED,
        ):
            return Response(
                {
                    "detail": "Questo preventivo non può essere accettato."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        quote.status = Quote.Status.ACCEPTED
        quote.accepted_at = timezone.now()

        quote.save(
            update_fields=[
                "status",
                "accepted_at",
            ]
        )

        QuoteNotification.objects.filter(
            quote=quote, status=QuoteNotification.REMINDER, read_at__isnull=True,
        ).update(read_at=quote.accepted_at)

        QuoteNotification.objects.create(
            user_id=quote.customer.user_id,
            quote=quote,
            status=quote.status,
            quote_title=quote.title,
            customer_name=quote.customer.name,
            created_at=quote.accepted_at,
        )

        return Response(
            PublicQuoteSerializer(quote).data
        )

class RejectQuoteView(APIView):
    permission_classes = [AllowAny]

    @transaction.atomic
    def post(self, request, token):
        try:
            quote = Quote.objects.select_for_update(of=("self",)).select_related("customer").get(
                public_token=token
            )
        except Quote.DoesNotExist:
            return Response(
                {"detail": "Preventivo non trovato."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if quote.status not in (
            Quote.Status.SENT,
            Quote.Status.VIEWED,
        ):
            return Response(
                {
                    "detail": "Questo preventivo non può essere rifiutato."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        quote.status = Quote.Status.REJECTED
        quote.rejected_at = timezone.now()

        quote.save(
            update_fields=[
                "status",
                "rejected_at",
            ]
        )

        QuoteNotification.objects.filter(
            quote=quote, status=QuoteNotification.REMINDER, read_at__isnull=True,
        ).update(read_at=quote.rejected_at)

        QuoteNotification.objects.create(
            user_id=quote.customer.user_id,
            quote=quote,
            status=quote.status,
            quote_title=quote.title,
            customer_name=quote.customer.name,
            created_at=quote.rejected_at,
        )

        return Response(
            PublicQuoteSerializer(quote).data
        )

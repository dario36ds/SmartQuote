from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet
from rest_framework.views import APIView
from .models import Quote
from .serializers import QuoteSerializer
from rest_framework.permissions import AllowAny
from .serializers import PublicQuoteSerializer
from ai_service.services import (
    OllamaServiceError,
    generate_quote_text,
)


class QuoteViewSet(ModelViewSet):
    serializer_class = QuoteSerializer

    def get_queryset(self):
        return (
            Quote.objects
            .filter(customer__user=self.request.user)
            .select_related("customer")
            .prefetch_related("items")
            .order_by("-created_at")
        )
    
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
    def publish(self, request, pk=None):
        quote = self.get_object()

        if quote.status != Quote.Status.DRAFT:
            return Response(
                {
                    "detail": "È possibile pubblicare solo un preventivo in bozza."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        quote.status = Quote.Status.SENT
        quote.sent_at = timezone.now()

        quote.save(
            update_fields=[
                "status",
                "sent_at",
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

    def get(self, request, token):
        try:
            quote = (
                Quote.objects
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

    def post(self, request, token):
        try:
            quote = Quote.objects.get(
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

        return Response(
            PublicQuoteSerializer(quote).data
        )

class RejectQuoteView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, token):
        try:
            quote = Quote.objects.get(
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

        return Response(
            PublicQuoteSerializer(quote).data
        )
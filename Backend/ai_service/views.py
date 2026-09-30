from django.shortcuts import render

# Create your views here.
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from .serializers import (
    QuickQuoteInputSerializer,
    QuickQuoteOutputSerializer,
)
from .services import (
    OllamaServiceError,
    generate_quick_quote,
)


class QuickQuoteView(APIView):

    def post(self, request):
        input_serializer = QuickQuoteInputSerializer(
            data=request.data
        )

        input_serializer.is_valid(
            raise_exception=True
        )

        try:
            result = generate_quick_quote(
                input_serializer.validated_data["text"]
            )

        except OllamaServiceError as exc:
            return Response(
                {
                    "detail": str(exc)
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        output_serializer = QuickQuoteOutputSerializer(
            data=result
        )

        if not output_serializer.is_valid():
            return Response(
                {
                    "detail": (
                        "La risposta generata dall'AI "
                        "non è valida."
                    ),
                    "errors": output_serializer.errors,
                },
                status=status.HTTP_502_BAD_GATEWAY,
            )

        return Response(
            output_serializer.validated_data
        )
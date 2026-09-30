from rest_framework.viewsets import ModelViewSet

from .models import Quote
from .serializers import QuoteSerializer


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
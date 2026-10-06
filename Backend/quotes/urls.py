from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    AcceptQuoteView,
    PublicQuoteView,
    QuoteViewSet,
    RejectQuoteView,
    ViewQuoteView,
)


router = DefaultRouter()

router.register(
    "",
    QuoteViewSet,
    basename="quote",
)

urlpatterns = [
    path(
        "public/<uuid:token>/",
        PublicQuoteView.as_view(),
        name="public-quote",
    ),
    path(
        "public/<uuid:token>/view/",
        ViewQuoteView.as_view(),
        name="view-quote",
    ),
    path(
        "public/<uuid:token>/accept/",
        AcceptQuoteView.as_view(),
        name="accept-quote",
    ),
    path(
        "public/<uuid:token>/reject/",
        RejectQuoteView.as_view(),
        name="reject-quote",
    ),
]

urlpatterns += router.urls

from django.urls import path

from .views import QuickQuoteView


urlpatterns = [
    path(
        "quick-quote/",
        QuickQuoteView.as_view(),
        name="quick-quote",
    ),
]
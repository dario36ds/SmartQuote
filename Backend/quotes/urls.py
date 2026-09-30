from rest_framework.routers import DefaultRouter

from .views import QuoteViewSet


router = DefaultRouter()

router.register(
    "",
    QuoteViewSet,
    basename="quote",
)

urlpatterns = router.urls
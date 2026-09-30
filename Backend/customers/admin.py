from django.contrib import admin

from .models import Customer


@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "name",
        "company",
        "email",
        "user",
        "created_at",
    )

    search_fields = (
        "name",
        "company",
        "email",
    )
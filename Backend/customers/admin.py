from django.contrib import admin

from .models import Customer


@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "company",
        "email",
        "phone",
        "user",
        "created_at",
    )

    search_fields = (
        "name",
        "company",
        "email",
        "phone",
    )

    list_filter = (
        "created_at",
    )

    readonly_fields = (
        "created_at",
        "updated_at",
    )

    fieldsets = (
        (
            "Cliente",
            {
                "fields": (
                    "user",
                    "name",
                    "company",
                    "email",
                    "phone",
                    "address",
                )
            },
        ),
        (
            "Date",
            {
                "fields": (
                    "created_at",
                    "updated_at",
                ),
                "classes": ("collapse",),
            },
        ),
    )
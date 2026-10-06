from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.db import transaction
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import CompanyProfile
from .serializers import (
    ChangeEmailSerializer,
    ChangePasswordSerializer,
    RegisterSerializer,
    UserSerializer,
    CompanyProfileSerializer,
)


class CompanyProfileView(APIView):
    def get(self, request):
        profile = CompanyProfile.objects.filter(user=request.user).first()
        return Response(CompanyProfileSerializer(profile or CompanyProfile()).data)

    @transaction.atomic
    def patch(self, request):
        user = User.objects.select_for_update().get(pk=request.user.pk)
        profile, _ = CompanyProfile.objects.get_or_create(user=user)
        serializer = CompanyProfileSerializer(profile, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = serializer.save()
        token, _ = Token.objects.get_or_create(user=user)

        return Response(
            {
                "token": token.key,
                "user": UserSerializer(user).data,
            },
            status=status.HTTP_201_CREATED,
        )


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        username = request.data.get("username")
        password = request.data.get("password")

        if not username or not password:
            return Response(
                {
                    "detail": "Username e password sono obbligatori."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = authenticate(
            username=username,
            password=password,
        )

        if user is None:
            return Response(
                {
                    "detail": "Credenziali non valide."
                },
                status=status.HTTP_401_UNAUTHORIZED,
            )

        token, _ = Token.objects.get_or_create(user=user)

        return Response(
            {
                "token": token.key,
                "user": UserSerializer(user).data,
            }
        )


class LogoutView(APIView):
    def post(self, request):
        request.auth.delete()

        return Response(
            status=status.HTTP_204_NO_CONTENT
        )


class MeView(APIView):
    def get(self, request):
        return Response(
            UserSerializer(request.user).data
        )

    @transaction.atomic
    def patch(self, request):
        user = User.objects.select_for_update().get(pk=request.user.pk)
        serializer = ChangeEmailSerializer(data=request.data, context={"user": user})
        serializer.is_valid(raise_exception=True)
        user.email = serializer.validated_data["email"]
        user.save(update_fields=["email"])
        return Response(UserSerializer(user).data)


class ChangePasswordView(APIView):
    @transaction.atomic
    def post(self, request):
        user = User.objects.select_for_update().get(pk=request.user.pk)
        serializer = ChangePasswordSerializer(data=request.data, context={"user": user})
        serializer.is_valid(raise_exception=True)
        user.set_password(serializer.validated_data["new_password"])
        user.save(update_fields=["password"])
        Token.objects.filter(user=user).delete()
        token = Token.objects.create(user=user)
        return Response({"token": token.key, "user": UserSerializer(user).data})

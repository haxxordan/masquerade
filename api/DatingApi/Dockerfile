FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
ARG BUILD_CONFIGURATION=Release
WORKDIR /src

COPY ["api/DatingApi/DatingApi.csproj", "api/DatingApi/"]
RUN dotnet restore "api/DatingApi/DatingApi.csproj"

COPY . .
WORKDIR "/src/api/DatingApi"
RUN dotnet publish "DatingApi.csproj" -c $BUILD_CONFIGURATION -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app

# Install required system libraries for authentication and security
RUN apt-get update && apt-get install -y libgssapi-krb5-2 libk5crypto3 && rm -rf /var/lib/apt/lists/*

COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "DatingApi.dll"]

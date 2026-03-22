FROM mcr.microsoft.com/dotnet/sdk:10.0 AS migrator
WORKDIR /src

COPY ["api/DatingApi/DatingApi.csproj", "api/DatingApi/"]
RUN dotnet restore "api/DatingApi/DatingApi.csproj"

COPY . .

ENTRYPOINT ["dotnet", "ef"]

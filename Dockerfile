# 1) Frontend React (Vite)
FROM node:20-alpine AS frontend
WORKDIR /src/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# 2) API ASP.NET Core 8
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS backend
WORKDIR /src/backend
COPY backend/HRPortal.Api.csproj ./
RUN dotnet restore
COPY backend/ ./
RUN dotnet publish -c Release -o /app/publish --no-restore

# 3) Imagen final: la API sirve también el frontend compilado
FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app
COPY --from=backend /app/publish ./
COPY --from=frontend /src/frontend/dist ./wwwroot
RUN mkdir -p /app/data && chown -R app:app /app/data
USER app
ENV ASPNETCORE_ENVIRONMENT=Production \
    TZ=Europe/Madrid \
    Database__Path=/app/data/hrportal.db \
    PORT=8080
EXPOSE 8080
CMD ["sh", "-c", "dotnet HRPortal.Api.dll --urls http://0.0.0.0:${PORT}"]

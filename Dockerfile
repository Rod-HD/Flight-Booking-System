# Ảnh chạy phần mềm trên máy chủ Linux (Render, Azure, máy có Docker): dựng giao diện bằng Node, publish máy chủ .NET 10,
# rồi chép giao diện đã dựng vào wwwroot. Chuỗi kết nối và mật khẩu truyền bằng biến môi trường, không ghi vào ảnh.

FROM node:22-bookworm-slim AS web
WORKDIR /src/web
COPY web/package.json web/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY web/ ./
RUN npm run build

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS api
WORKDIR /src
COPY api/QuanLyBanVe.Api/QuanLyBanVe.Api.csproj api/QuanLyBanVe.Api/
RUN dotnet restore api/QuanLyBanVe.Api/QuanLyBanVe.Api.csproj
COPY api/QuanLyBanVe.Api/ api/QuanLyBanVe.Api/
RUN dotnet publish api/QuanLyBanVe.Api/QuanLyBanVe.Api.csproj -c Release -o /app --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0
# tzdata: giờ Việt Nam qua biến TZ; phông DejaVu để xuất PDF, Excel có đủ chữ tiếng Việt
RUN apt-get update \
 && apt-get install -y --no-install-recommends tzdata fontconfig fonts-dejavu-core \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=api /app ./
COPY --from=web /src/web/dist ./wwwroot
ENV TZ=Asia/Ho_Chi_Minh \
    ASPNETCORE_FORWARDEDHEADERS_ENABLED=true \
    Phien__ThuMuc=/tmp/phien \
    NhatKy__ThuMuc=/tmp/nhat_ky
USER $APP_UID
# Render cấp cổng qua biến PORT; appsettings.json đặt Urls là localhost nên phải ghi đè bằng --urls
CMD ["sh", "-c", "exec dotnet QuanLyBanVe.Api.dll --urls http://0.0.0.0:${PORT:-8080}"]

FROM node:24-alpine AS builder-client

WORKDIR /app

RUN npm install -g pnpm

COPY client/package.json client/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY client/ ./
RUN pnpm run build

FROM golang:alpine AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download
COPY *.go ./

COPY --from=builder-client /app/dist /app/client/dist
COPY /data/categories.json /app/data/categories.json

RUN apk add --no-cache \
    ca-certificates \
    && update-ca-certificates

ARG TARGETOS TARGETARCH
RUN CGO_ENABLED=0 GOOS=$TARGETOS GOARCH=$TARGETARCH go build -o main .

FROM scratch AS runner

COPY --from=builder /app/main /app/main
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/

EXPOSE 8080

ENTRYPOINT ["/app/main"]

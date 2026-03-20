# Resonant - Online messaging app

A modern, production-grade Discord-like chat platform built with Quarkus, React, PostgreSQL, and Redis.

## Architecture

- **Backend**: Quarkus 3.x with RESTEasy Reactive, PostgreSQL ORM + Flyway migrations
- **Frontend**: React 18 + Vite, PWA-enabled
- **Database**: PostgreSQL (relational) + Redis (pub/sub, caching)
- **Deployment**: Docker containers, Kubernetes-ready

## Features (MVP)

- User authentication (username/password with JWT)
- Create and manage servers
- Create channels within servers
- Real-time WebSocket messaging
- Server Discovery and Join/Leave
- PWA support (offline caching, desktop install)
- Configurable rate limiting
- Full containerization with docker-compose

## Quick Start

### Local Development with Docker Compose

```bash
# Build and start all services
docker-compose up --build

# Services available at:
# Frontend: http://localhost:3000
# Backend: http://localhost:8080
# PostgreSQL: localhost:5432
# Redis: localhost:6379
```

### Manual Development Setup

**Backend:**
```bash
cd backend
mvn quarkus:dev
# Backend runs on http://localhost:8080
# Auto-reload enabled on code changes
```

**Frontend (separate terminal):**
```bash
cd frontend
npm install
npm run dev
# Frontend runs on http://localhost:5173
```

## Project Structure

```
.
├── backend/                     # Quarkus backend
│   ├── pom.xml
│   ├── src/main/java/com/resonant/
│   │   ├── entity/             # JPA entities
│   │   ├── resource/           # REST endpoints
│   │   ├── service/            # Business logic
│   │   └── dto/                # Data transfer objects
│   ├── src/main/resources/
│   │   ├── application.yml     # Quarkus config
│   │   └── db/migration/       # Flyway migrations
│   └── Dockerfile
├── frontend/                    # React frontend
│   ├── package.json
│   ├── src/
│   │   ├── components/         # React components
│   │   ├── hooks/              # Custom React hooks
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── public/
│   │   ├── index.html
│   │   ├── manifest.json       # PWA manifest
│   │   └── service-worker.js   # Service worker
│   └── Dockerfile
├── k8s/                         # Kubernetes manifests
├── .github/workflows/           # CI/CD pipelines
└── docker-compose.yml

```

## Configuration

### Rate Limiting

Rate limits are configurable via environment variables or `application.yml`:

```yaml
app:
  ratelimit:
    enabled: true
    messages-per-minute: 10      # Messages per user per minute
    channels-per-minute: 5       # Channel creations per user per minute
    servers-per-minute: 2        # Server creations per user per minute
    ttl-seconds: 60               # Window for counting requests
```

For Kubernetes, update `k8s/configmap.yaml`.


## Development Workflow

1. Create a branch: `git checkout -b feature/my-feature`
2. Make changes
3. Test locally: `mvn test` (backend), `npm test` (frontend)
4. Commit: `git commit -m "feat: description"`
5. Push: `git push origin feature/my-feature`
6. Create PR for code review

## API Documentation

Todo: swagger

## Deployment

### Local Docker Compose
```bash
docker-compose up -d
```

### Kubernetes (Minikube)
```bash
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/backend-deployment.yaml
kubectl apply -f k8s/frontend-deployment.yaml
kubectl apply -f k8s/service.yaml

# Port-forward to access
kubectl port-forward svc/resonant-frontend 3000:80
kubectl port-forward svc/resonant-backend 8080:8080
```

### Production
Build and push images:
```bash
docker build -t myregistry/resonant-backend:1.0 ./backend
docker build -t myregistry/resonant-frontend:1.0 ./frontend
docker push myregistry/resonant-backend:1.0
docker push myregistry/resonant-frontend:1.0
```

Update `k8s/*.yaml` with image URLs and deploy.

## Troubleshooting

**Backend won't start:**
- Check PostgreSQL is running: `docker ps | grep postgres`
- Verify migrations ran: Logs should show "Flyway successfully validated migration..."
- Check environment variables in `application.yml`

**Frontend build fails:**
- Delete `node_modules` and `package-lock.json`, run `npm install` again
- Ensure Node.js 18+ is installed

**Messages not appearing:**
- Verify polling is working: Open DevTools Network tab, should see requests to `/api/channels/{id}/messages` every 2 seconds
- Check PostgreSQL for data: `docker exec resonant-postgres psql -U resonant -d resonant -c "SELECT * FROM messages;"`

## License

Apache 2.0 - See [LICENSE](LICENSE)

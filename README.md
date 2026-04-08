# Resonant - Online messaging app

A modern, privacy focused Discord-like chat platform built with Quarkus, React, PostgreSQL, and Redis.

## Architecture

- **Backend**: Quarkus 3.x with RESTEasy Reactive, PostgreSQL ORM + Flyway migrations
- **Frontend**: React 18 + Vite, PWA-enabled
- **Database**: PostgreSQL (relational) OR SQLite (file-based) + Redis (pub/sub, caching)

## Features (MVP)

- User authentication (username/password with JWT)
- Create and manage servers
- Create channels within servers
- Real-time WebSocket messaging
- Server Discovery and Join/Leave
- PWA support (offline caching, desktop install)

## Project Structure

`backend` -- Contains all the backend related files: the Quarkus project, Dockerfile for running it and database migrations

`frontend` -- Contains the frontend components, vite config, Playwright tests and Dockerfiles for both the frontend and running e2e tests

`k8s` -- Example Kubernetes manifests

In the root of the project is a docker-compose file for running the app.

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
# Frontend runs on http://localhost:3000
```


## API Documentation

### OpenAPI/Swagger Documentation

Once the application is running, you can access the interactive API documentation at:

- **Swagger UI**: `http://localhost:8080/q/swagger-ui`
- **OpenAPI JSON**: `http://localhost:8080/q/openapi`
- **OpenAPI YAML**: `http://localhost:8080/q/openapi?format=yaml`


## Deployment

There are multiple ways of running the application depending on your technical ability, installed dependencies or system requirements.


## "Standalone mode" - easiest for beginners

This mode uses the SQLite database for easiest deployment and no installation of additional dependencies. It's only recommended for demos or a small number of users. Proceed with caution. It's recommended to replace the certificates with your own, or use Let's Encrypt!

1. Download the assets for running the backend from the `release` (link) page.
2. Modify the application.yaml file based on your needs.
3. Run the native executable from your terminal of choice:

  - Linux: `./resonant-backend-1-runner -Dquarkus.profile=sqlite`
  - Windows: `.\resonant-backend-1-runner.exe -Dquarkus.profile=sqlite`

4. Use the frontend from Github Pages (link) to connect to your local backend by changing the instance in the settings:

<screenshot>

Alternatively, deploy the frontend bundle from the releases behind LAMP/WAMP or nginx. See on-prem mode for more details. Other people can connect through a VPN such as Radmin or by exposing the frontend and backend ports to the internet.


## Local Docker Compose

This mode also enables easy deployment and all of the services locally, but has similar drawbacks of not being easily accessed over the internet. Requires docker and docker compose installed.

1. Clone the project locally
2. Run `docker-compose up -d`
3. Try connecting to `http://localhost:3000`(link)
  

## On-prem

This method requires nginx (or any other standalone web server), an installation of PostgreSQL and Redis.

Download (or build) the backend binaries and frontend bundle. Configure the backend to point to your databases by modifying the application.yaml file. Put the frontend bundle into your serving directories.


## Kubernetes (Minikube)

Build and push images:
```bash
docker build -t myregistry/resonant-backend:1.0 ./backend
docker build -t myregistry/resonant-frontend:1.0 ./frontend
docker push myregistry/resonant-backend:1.0
docker push myregistry/resonant-frontend:1.0
```
... or use the ones from the github container registry.

Update `k8s/*.yaml` with image URLs and deploy.

```bash
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/backend-deployment.yaml
kubectl apply -f k8s/frontend-deployment.yaml
kubectl apply -f k8s/service.yaml

# Port-forward to access
kubectl port-forward svc/resonant-frontend 3000:80
kubectl port-forward svc/resonant-backend 8080:8080
```


## Troubleshooting

TODO: update with common issues and solutions.

## Roadmap

See Wiki(link).


## Contributing

1. Create a branch: `git checkout -b feature/my-feature`
2. Make changes
3. Write tests for your feature and make sure they are passing. Playwright tests are really helpful for any big features
4. Commit: `git commit -m "feat: description"` (use conventional commits if possible)
5. Push: `git push origin feature/my-feature`
6. Create PR for code review

## License

Apache 2.0 - See [LICENSE](LICENSE)

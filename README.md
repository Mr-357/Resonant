# Resonant - Online messaging app

A modern, privacy focused Discord-like chat platform built with Quarkus and React.

## Architecture

- **Backend**: Quarkus 3.x with RESTEasy Reactive, PostgreSQL ORM + Flyway migrations
- **Frontend**: React 18 + Vite, PWA-enabled
- **Database**: PostgreSQL (relational) OR SQLite (file-based)

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
# Frontend: https://localhost:3443
# Backend: http://localhost:8080
# PostgreSQL: localhost:5432
# Redis: localhost:6379
```

### Manual Development Setup

**Backend:**
```bash
cd backend
mvn quarkus:dev
# Backend runs on https://localhost:8443
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

4. Use the frontend from Github Pages (link) to connect to your local backend by changing the instance:

- In case the demo server is down:

!["Server not reachable"](.github/assets/backend_down.png "Server not reachable")

- In case you are not logged in:

!["Not logged in"](.github/assets/logged_out.png "Not logged in")

- In case you are logged in:

!["Logged in"](.github/assets/logged_in.png "Logged in")

You can also download the PWA version and have it available locally and change instances as you please. Other people can connect to your backend through a VPN such as Radmin or by exposing the backend ports to the internet. You will get an SSL error when using self-signed certificates, so you and anyone else who wants to connect must import the certificate located in `certs/server.crt` into their browser or system trust store. On Google Chrome, this can be done by going to Settings>Advanced>Privacy and Security>Manage Certificates. In that page you can import the file, restart Chrome and the error should no longer appear.


## Local Docker Compose

This mode also enables easy deployment and all of the services locally, but has similar drawbacks of not being easily accessed over the internet. Requires docker and docker compose installed.

1. Clone the project locally
2. Run `docker-compose up -d`
3. Try connecting to `https://localhost:3443`
  

## On-premise Deployment

For a production-grade on-premise installation, you'll need to set up the infrastructure components manually.

### Prerequisites

- **Java 17+** (to run the backend)
- **Node.js 18+** (to build the frontend)
- **PostgreSQL** (Relational Database)
- **Redis** (For rate limiting and WebSocket pub/sub)
- **Nginx** (As a reverse proxy and static file server)

### 1. Build the Application

**Backend:**
Generate the optimized Quarkus JAR:
```bash
cd backend
./mvnw clean package -DskipTests
# The output will be in backend/target/quarkus-app/
```
... Or you can build the native executable:
```bash
cd backend
./mvnw clean package -DskipTests -Dnative
```
**Frontend:**
Build the production static assets:
```bash
cd frontend
npm install
npm run build
# The static files will be in frontend/dist/
```

### 2. Configuration

Update your `backend/src/main/resources/application.yml` or set environment variables for:
- `DB_URL`, `DB_USER`, `DB_PASSWORD`
- `REDIS_HOSTS`
- `SSL_CERT_PATH` and `SSL_KEY_PATH`
- `JWT_PRIVATE_KEY` and `JWT_PUBLIC_KEY` paths

### 3. Nginx Configuration

Create an Nginx server block to serve the frontend and proxy API/WebSocket requests to the backend:

```nginx
server {
    listen 443 ssl;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # Serve Frontend Static Files
    location / {
        root /var/www/resonant/frontend;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # Proxy Backend API & WebSockets
    location ~ ^/(api|q|ws) {
        proxy_pass https://localhost:8443;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### 4. Running as a System Service

To ensure the backend starts automatically on boot, create a systemd service file at `/etc/systemd/system/resonant.service`:

```ini
[Unit]
Description=Resonant Backend
After=network.target postgresql.service redis.service

[Service]
User=resonant
WorkingDirectory=/opt/resonant/backend
ExecStart=/usr/bin/java -jar target/quarkus-app/quarkus-run.jar
# Or if you're using the native executable: target/resonant-backend-<version>-runner
Restart=on-failure
RestartSec=5


SuccessExitStatus=143
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Enable and start the service:
```bash
sudo systemctl enable resonant
sudo systemctl start resonant
```


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

### Issues

If you encounter an issue or a bug while using the app, please create a Github issue with the details of what you're experiencing. A template will be provided when you create a new issue, so follow the instructions provided.

### Making Changes

1. Create a fork of the project
2. Create a branch: `git checkout -b feature/my-feature`
3. Make changes
4. Write tests for your feature and make sure they are passing. Playwright tests are really helpful for any big features
5. Commit: `git commit -m "feat: description"` (use conventional commits if possible)
6. Push: `git push origin feature/my-feature`
7. Create PR for code review

## License

Apache 2.0 - See [LICENSE](LICENSE)

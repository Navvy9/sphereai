# SphereAI

SphereAI is a full-stack document processing platform with:

- React + Vite frontend for the web app
- Node.js + Express + Prisma backend for API and database access
- Python + FastAPI AI service for document processing and OCR
- PostgreSQL database via Docker Compose for local development
- AWS S3 storage and AWS Cognito authentication

This project is designed so that local development is easy and production deployment can be done across separate platforms such as Vercel, Render, Railway, or AWS.

---

## Project architecture

- Frontend: `Frontend/`
- Backend: `Backend/`
- AI service: `AI-services/`
- Local database config: `docker-compose.yml`
- Root scripts: `package.json`

### Tech stack

- Frontend: React 19, Vite, TypeScript
- Backend: Node.js, Express, Prisma, PostgreSQL
- AI service: Python, FastAPI, Uvicorn
- Database: PostgreSQL 15
- Storage: AWS S3
- Auth: AWS Cognito
- OCR / document processing: Tesseract + Python libraries

---

## Prerequisites

Before you start, install the following:

- Git
- Node.js 20+ and npm
- Python 3.11+
- Docker Desktop or Docker Engine + Docker Compose
- Optional: Tesseract OCR

### Install Tesseract (required for OCR features)

#### macOS

```bash
brew install tesseract
```

#### Ubuntu / Debian

```bash
sudo apt-get update
sudo apt-get install -y tesseract-ocr
```

#### Windows

Install Tesseract from:
https://github.com/UB-Mannheim/tesseract/wiki

Then add it to your PATH.

---

## Repository setup

Clone the project:

```bash
git clone https://github.com/Navvy9/sphereai.git
cd sphereai
```

If you already have the repo locally, just go to the project folder:

```bash
cd /path/to/SphereAI
```

---

## Environment variables

Never commit real secrets to GitHub. Use `.env` files locally only.

### 1) Backend environment

Create a file at `Backend/.env`:

```env
PORT=5001
NODE_ENV=development
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/sphereai?sslmode=disable

AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_S3_BUCKET_NAME=your-s3-bucket-name

COGNITO_USER_POOL_ID=us-east-1_xxxxxxxxx
COGNITO_CLIENT_ID=your_cognito_client_id
```

Notes:

- `DATABASE_URL` points to the local Docker Postgres instance running on port `5433`.
- `AWS_S3_BUCKET_NAME` is the bucket the app uploads and reads from.
- `COGNITO_USER_POOL_ID` and `COGNITO_CLIENT_ID` are used by the frontend authentication flow.

### 2) Frontend environment

Create a file at `Frontend/.env`:

```env
VITE_COGNITO_AUTHORITY=https://cognito-idp.us-east-1.amazonaws.com/us-east-1_xxxxxxxxx
VITE_COGNITO_CLIENT_ID=your_cognito_client_id
VITE_COGNITO_REDIRECT_URI=http://localhost:5173/auth/callback
VITE_COGNITO_POST_LOGOUT_REDIRECT_URI=http://localhost:5173
```

### 3) Optional root environment file

You may also want a root `.env` for local dev convenience:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/sphereai
BACKEND_PORT=5001
AI_SERVICE_URL=http://localhost:8001
VITE_API_URL=http://localhost:5001
```

---

## Docker setup for local PostgreSQL

This project includes a PostgreSQL container in `docker-compose.yml`.

### Start the database

```bash
docker compose up -d db
```

### Check status

```bash
docker compose ps
```

### View logs

```bash
docker compose logs -f db
```

### Stop the database

```bash
docker compose down
```

### Docker compose file details

The database is configured with:

- PostgreSQL image: `postgres:15`
- Database name: `sphereai`
- Username: `postgres`
- Password: `postgres`
- Host port: `5433`
- Container port: `5432`

This matches the default connection string in the backend environment:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/sphereai?sslmode=disable
```

---

## Install dependencies

### Root dependencies

```bash
npm install
```

### Frontend dependencies

```bash
cd Frontend
npm install
```

### Backend dependencies

```bash
cd Backend
npm install
```

### AI service dependencies

```bash
cd AI-services
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

---

## Run the project locally

### Option A: Run everything with one command from the root

The root `package.json` has a dev script that starts PostgreSQL, backend, frontend, and AI service together.

```bash
cd /path/to/SphereAI
npm install
npm run dev
```

This script runs:

- Docker database
- Frontend app on Vite
- Backend API on Express/Node
- AI service on FastAPI/Uvicorn

### Option B: Run each service manually

#### 1) Start database

```bash
docker compose up -d db
```

#### 2) Start AI service

```bash
cd AI-services
source .venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 8001
```

#### 3) Start backend

```bash
cd Backend
npx prisma generate
npx prisma migrate deploy
npm run dev
```

#### 4) Start frontend

```bash
cd Frontend
npm install
npm run dev -- --host 0.0.0.0
```

### Local URLs

- Frontend: http://localhost:5173
- Backend: http://localhost:5001
- AI service: http://localhost:8001
- PostgreSQL: localhost:5433

---

## Prisma setup

The backend uses Prisma with PostgreSQL.

### Generate Prisma client

```bash
cd Backend
npx prisma generate
```

### Run migrations

```bash
cd Backend
npx prisma migrate deploy
```

### Create a new migration

```bash
cd Backend
npx prisma migrate dev --name your_migration_name
```

### View Prisma DB

```bash
cd Backend
npx prisma studio
```

---

## AWS setup

This project uses AWS for storage and authentication.

### 1) Create an S3 bucket

```bash
aws s3 mb s3://your-s3-bucket-name --region us-east-1
```

Use the bucket name in:

```env
AWS_S3_BUCKET_NAME=your-s3-bucket-name
```

### 2) Create IAM credentials

Create an IAM user or role that has access to the bucket.

Minimum required actions for a simple setup:

- `s3:PutObject`
- `s3:GetObject`
- `s3:DeleteObject`
- `s3:ListBucket`

Use the access key and secret key in:

```env
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
```

Do not commit these values into Git.

### 3) Configure AWS Cognito

Create a Cognito User Pool:

1. Go to AWS Cognito Console
2. Create a User Pool
3. Add app client
4. Enable sign-in with email or username
5. Configure callback URLs:
   - `http://localhost:5173/auth/callback`
   - `https://your-production-domain/auth/callback`
6. Save the User Pool ID and Client ID

Then set:

```env
COGNITO_USER_POOL_ID=us-east-1_xxxxxxxxx
COGNITO_CLIENT_ID=your_cognito_client_id
```

and frontend variables:

```env
VITE_COGNITO_AUTHORITY=https://cognito-idp.us-east-1.amazonaws.com/us-east-1_xxxxxxxxx
VITE_COGNITO_CLIENT_ID=your_cognito_client_id
VITE_COGNITO_REDIRECT_URI=http://localhost:5173/auth/callback
VITE_COGNITO_POST_LOGOUT_REDIRECT_URI=http://localhost:5173
```

---

## AI service details

The AI service is built in Python and provides document processing endpoints.

### Run it manually

```bash
cd AI-services
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8001
```

### Health check

```bash
curl http://localhost:8001/health
```

### Processing endpoint

```bash
curl -X POST http://localhost:8001/process \
  -H "Content-Type: application/json" \
  -d '{
    "documentId": "demo-1",
    "fileName": "sample.pdf",
    "mimeType": "application/pdf",
    "downloadUrl": "https://example.com/sample.pdf",
    "bucketName": "your-s3-bucket-name",
    "s3Key": "demo/sample.pdf"
  }'
```

This service supports file processing such as:

- text files
- markdown files
- PDFs
- images via OCR
- DOCX documents

---

## Production deployment

### Option 1: Frontend deployment with Vercel

1. Push code to GitHub
2. Go to https://vercel.com
3. Import the repo
4. Set root directory to `Frontend`
5. Build command:

```bash
npm install && npm run build
```

6. Output directory:

```bash
dist
```

7. Set environment variables:

```env
VITE_COGNITO_AUTHORITY=https://cognito-idp.us-east-1.amazonaws.com/us-east-1_xxxxxxxxx
VITE_COGNITO_CLIENT_ID=your_cognito_client_id
VITE_COGNITO_REDIRECT_URI=https://your-frontend-domain/auth/callback
VITE_COGNITO_POST_LOGOUT_REDIRECT_URI=https://your-frontend-domain
```

### Option 2: Backend deployment with Render / Railway

Set the backend project root to `Backend`.

Build command:

```bash
npm install && npx prisma generate && npm run build
```

Start command:

```bash
npm run start
```

Environment variables:

```env
PORT=5001
NODE_ENV=production
DATABASE_URL=postgresql://user:password@host:5432/dbname?sslmode=require
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_S3_BUCKET_NAME=your-s3-bucket-name
COGNITO_USER_POOL_ID=us-east-1_xxxxxxxxx
COGNITO_CLIENT_ID=your_cognito_client_id
```

Also run database migrations after deployment:

```bash
npx prisma migrate deploy
```

### Option 3: AI service deployment with Render / Railway

Set the project root to `AI-services`.

Build command:

```bash
pip install -r requirements.txt
```

Start command:

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8001
```

Environment variables:

```env
PORT=8001
```

### Option 4: Postgres database deployment

For production, prefer a managed database instead of local Docker:

- Supabase
- Neon
- AWS RDS
- Render Postgres

Then update `DATABASE_URL` to your hosted PostgreSQL URL.

---

## GitHub setup

Initialize a repo if it is not already set:

```bash
git init
git add .
git commit -m "Initial project setup"
git branch -M main
git remote add origin https://github.com/your-username/sphereai.git
git push -u origin main
```

---

## Useful commands

### Root project

```bash
npm run db
npm run dev
npm run down
```

### Backend

```bash
cd Backend
npm install
npx prisma generate
npx prisma migrate deploy
npm run build
npm run start
```

### Frontend

```bash
cd Frontend
npm install
npm run dev
npm run build
```

### AI service

```bash
cd AI-services
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8001
```

---

## Troubleshooting

### 1) Prisma connection error

Check:

- Docker DB is running
- `DATABASE_URL` is correct
- Postgres port `5433` is open

```bash
docker compose ps
```

### 2) S3 upload fails

Check:

- bucket name is valid
- IAM user/role has S3 permissions
- AWS credentials are set correctly

### 3) Frontend login fails

Check:

- Cognito User Pool ID is correct
- frontend `.env` values match the app client
- callback URLs are configured exactly

### 4) AI service not responding

Check:

```bash
curl http://localhost:8001/health
```

Also verify Python dependencies are installed and Tesseract is available if OCR is used.

### 5) CORS issues

The backend uses `cors()` in the Express app. If a production deploy fails, verify the frontend origin is allowed and the API base URL is configured correctly.

---

## Security notes

- Never store real `.env` files in GitHub
- Keep AWS credentials in a secure secret manager or environment variables
- Rotate access keys regularly
- Use least-privilege IAM policies
- Only expose the minimum necessary endpoints in production
- Use HTTPS in production deployments

---

## License

This project does not include a license file yet. If you are publishing it publicly, add an appropriate open-source license such as MIT or Apache 2.0.

---

## Final recommendation

For most small teams, the easiest production setup is:

- Frontend: Vercel
- Backend: Render
- AI service: Render
- Database: Supabase or Neon
- Storage: AWS S3
- Auth: AWS Cognito

This gives a clean separation between UI, API, AI processing, and data persistence while keeping deployments straightforward.

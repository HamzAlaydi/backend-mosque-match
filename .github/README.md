# Backend CI/CD Workflows

This directory contains GitHub Actions workflows for the mosque-match backend deployment.

## Workflows

### 1. `deploy.yml` - Production Deployment
- **Trigger**: Push to `main` branch
- **Purpose**: Deploy the backend to EC2 production server
- **Steps**:
  - Checkout code
  - Install dependencies
  - Archive backend files (excluding sensitive files)
  - Upload to EC2
  - Deploy and restart with PM2
  - Health check and backup management

### 2. `test.yml` - Testing and Quality Checks
- **Trigger**: Push to `main` and Pull Requests
- **Purpose**: Run tests, linting, and security checks
- **Steps**:
  - Checkout code
  - Install dependencies
  - Run linting (if configured)
  - Run tests (if configured)
  - Security audit
  - Build verification

## Required Secrets

Make sure these secrets are configured in your GitHub repository:

- `SSH_KEY`: Private SSH key for EC2 access
- `EC2_USERNAME`: SSH username (usually `ubuntu` or `ec2-user`)
- `EC2_HOST`: EC2 instance IP address or domain

## Environment Variables

The deployment script sets these environment variables on the server:
- `NODE_ENV=production`
- `PORT=5000`

## PM2 Configuration

The backend is deployed using PM2 with the following configuration:
- **Name**: `mosque-backend`
- **Logs**: `/var/www/mosqueSearch-backend/logs/`
- **Memory limit**: 512MB restart
- **Auto-restart**: Enabled

## Backup Strategy

- Creates timestamped backups before each deployment
- Keeps the last 3 backups
- Automatically cleans up older backups

## Directory Structure on EC2

```
/var/www/mosqueSearch-backend/
├── server.js
├── package.json
├── controllers/
├── models/
├── routes/
├── middleware/
├── uploads/
└── logs/
    ├── backend.log
    └── backend-error.log
```

## Monitoring

- PM2 provides process monitoring
- Logs are stored in `/var/www/mosqueSearch-backend/logs/`
- Health checks are performed after deployment

## Troubleshooting

1. **Deployment fails**: Check PM2 logs with `pm2 logs mosque-backend`
2. **Server won't start**: Check environment variables and dependencies
3. **Permission issues**: Ensure proper file permissions on EC2
4. **Port conflicts**: Verify port 5000 is available and not blocked by firewall 
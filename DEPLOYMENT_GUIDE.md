# Deployment Guide

This guide covers deploying the Calendar Photo Converter to various platforms and environments.

## Table of Contents

- [Pre-Deployment Checklist](#pre-deployment-checklist)
- [Environment Configuration](#environment-configuration)
- [Deployment Options](#deployment-options)
  - [Heroku](#heroku-deployment)
  - [AWS EC2](#aws-ec2-deployment)
  - [DigitalOcean](#digitalocean-deployment)
  - [Docker](#docker-deployment)
  - [Vercel/Netlify](#vercelnetlify-deployment)
- [Post-Deployment](#post-deployment)
- [Monitoring](#monitoring)
- [Troubleshooting](#troubleshooting)

## Pre-Deployment Checklist

Before deploying to production, ensure you have:

- [ ] **Environment Variables Configured**
  - ANTHROPIC_API_KEY
  - NODE_ENV=production
  - PORT (if required by platform)
  - CORS_ORIGINS (comma-separated allowed domains)

- [ ] **Security Review**
  - [ ] All inputs validated
  - [ ] Rate limiting enabled
  - [ ] Error messages don't leak sensitive info
  - [ ] HTTPS configured
  - [ ] CORS properly configured

- [ ] **Testing**
  - [ ] All tests passing: `node validation.test.js`
  - [ ] Manual testing completed
  - [ ] Load testing performed

- [ ] **Documentation**
  - [ ] API documentation updated
  - [ ] README accurate
  - [ ] Environment variables documented

- [ ] **Dependencies**
  - [ ] `npm audit` shows no critical vulnerabilities
  - [ ] All dependencies up to date

## Environment Configuration

### Production Environment Variables

Create a `.env` file (or configure in your platform):

```bash
# Required
ANTHROPIC_API_KEY=your_production_api_key
NODE_ENV=production
PORT=8080

# Optional
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
LOG_TO_FILE=true
MAX_UPLOAD_SIZE=10

# Google Calendar (if enabled)
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=https://yourdomain.com/auth-callback.html
```

### Security Best Practices

1. **Never commit `.env` files**
   ```bash
   # Verify .gitignore includes:
   .env
   .env.local
   .env.*.local
   ```

2. **Use platform secret managers**
   - Heroku: Config Vars
   - AWS: Secrets Manager
   - DigitalOcean: App Platform Environment Variables

3. **Rotate API keys regularly**
   - Set calendar reminders
   - Use key rotation scripts

## Deployment Options

### Heroku Deployment

Heroku is a platform-as-a-service (PaaS) that makes deployment simple.

#### Prerequisites
- Heroku account
- Heroku CLI installed

#### Steps

1. **Login to Heroku**
   ```bash
   heroku login
   ```

2. **Create Heroku app**
   ```bash
   heroku create my-calendar-converter
   ```

3. **Set environment variables**
   ```bash
   heroku config:set ANTHROPIC_API_KEY=your_key
   heroku config:set NODE_ENV=production
   ```

4. **Deploy**
   ```bash
   git push heroku main
   ```

5. **Scale dynos**
   ```bash
   heroku ps:scale web=1
   ```

6. **Open app**
   ```bash
   heroku open
   ```

#### Heroku Configuration Files

**`Procfile`** (create in project root):
```
web: node backend/api-server.js
```

**`package.json`** (add engines):
```json
{
  "engines": {
    "node": "18.x",
    "npm": "9.x"
  }
}
```

#### Cost Estimate
- **Hobby Dyno**: $7/month
- **Standard Dyno**: $25-50/month
- **Anthropic API**: Pay per use

---

### AWS EC2 Deployment

Deploy on Amazon Web Services EC2 for full control.

#### Prerequisites
- AWS account
- SSH key pair

#### Steps

1. **Launch EC2 Instance**
   - AMI: Ubuntu 22.04 LTS
   - Instance type: t2.micro (free tier) or t2.small
   - Security group: Allow HTTP (80), HTTPS (443), SSH (22)

2. **Connect to instance**
   ```bash
   ssh -i your-key.pem ubuntu@your-ec2-ip
   ```

3. **Install Node.js**
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

4. **Clone and setup**
   ```bash
   git clone https://github.com/yourusername/AI-calendar-from-paper-one.git
   cd AI-calendar-from-paper-one/backend
   npm install --production
   ```

5. **Configure environment**
   ```bash
   nano .env
   # Add your production variables
   ```

6. **Install PM2** (process manager)
   ```bash
   sudo npm install -g pm2
   pm2 start api-server.js --name calendar-api
   pm2 startup
   pm2 save
   ```

7. **Configure Nginx** (reverse proxy)
   ```bash
   sudo apt-get install nginx
   sudo nano /etc/nginx/sites-available/calendar-api
   ```

   ```nginx
   server {
       listen 80;
       server_name yourdomain.com;

       location / {
           proxy_pass http://localhost:9002;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

   ```bash
   sudo ln -s /etc/nginx/sites-available/calendar-api /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

8. **Setup SSL with Let's Encrypt**
   ```bash
   sudo apt-get install certbot python3-certbot-nginx
   sudo certbot --nginx -d yourdomain.com
   ```

#### Cost Estimate
- **EC2 t2.micro**: Free tier (1 year) or $8/month
- **EC2 t2.small**: $17/month
- **Data transfer**: ~$0.09/GB

---

### DigitalOcean Deployment

Simple deployment on DigitalOcean App Platform.

#### Steps

1. **Create App**
   - Go to DigitalOcean App Platform
   - Connect GitHub repository
   - Select branch: `main`

2. **Configure Build**
   - Build command: `cd backend && npm install`
   - Run command: `node backend/api-server.js`

3. **Set Environment Variables**
   - Add all required variables in App Platform dashboard

4. **Deploy**
   - Click "Deploy"
   - Wait for build to complete

#### Cost Estimate
- **Basic Plan**: $5/month
- **Professional Plan**: $12/month

---

### Docker Deployment

Containerize for consistent deployment anywhere.

#### Create `Dockerfile`

```dockerfile
# Dockerfile
FROM node:18-alpine

# Create app directory
WORKDIR /usr/src/app

# Install dependencies
COPY backend/package*.json ./
RUN npm ci --only=production

# Copy app source
COPY backend/ .

# Create uploads directory
RUN mkdir -p uploads

# Expose port
EXPOSE 9002

# Start app
CMD ["node", "api-server.js"]
```

#### Create `.dockerignore`

```
node_modules
npm-debug.log
.env
.git
.gitignore
uploads
*.md
```

#### Build and Run

```bash
# Build image
docker build -t calendar-converter .

# Run container
docker run -p 9002:9002 \
  -e ANTHROPIC_API_KEY=your_key \
  -e NODE_ENV=production \
  calendar-converter
```

#### Docker Compose

**`docker-compose.yml`**:
```yaml
version: '3.8'

services:
  api:
    build: .
    ports:
      - "9002:9002"
    environment:
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - NODE_ENV=production
    restart: unless-stopped
    volumes:
      - ./uploads:/usr/src/app/uploads
```

Run with:
```bash
docker-compose up -d
```

---

### Vercel/Netlify Deployment

For serverless deployment (frontend + API routes).

#### Vercel

1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Deploy**
   ```bash
   vercel
   ```

3. **Add environment variables**
   ```bash
   vercel env add ANTHROPIC_API_KEY
   ```

#### Configuration

**`vercel.json`**:
```json
{
  "version": 2,
  "builds": [
    {
      "src": "backend/api-server.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "backend/api-server.js"
    },
    {
      "src": "/(.*)",
      "dest": "backend/frontend/$1"
    }
  ]
}
```

**Note**: File uploads may have size limits on serverless platforms.

## Post-Deployment

### Verification Steps

1. **Health check**
   ```bash
   curl https://yourdomain.com/api/health
   ```

2. **Test image upload**
   - Upload a small test image
   - Verify event extraction works

3. **Check logs**
   - Review server logs for errors
   - Verify logging is working

4. **Monitor metrics**
   - Response times
   - Error rates
   - API usage

### DNS Configuration

Point your domain to the server:

```
A Record:    @        -> your-server-ip
CNAME:       www      -> yourdomain.com
```

### SSL Certificate

Always use HTTPS in production:

**Let's Encrypt** (free):
```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

**Certificate renewal** (automatic with certbot):
```bash
sudo certbot renew --dry-run
```

## Monitoring

### Application Monitoring

**PM2 Monitoring** (if using PM2):
```bash
pm2 monit
pm2 logs
pm2 status
```

**View logs**:
```bash
# Real-time logs
pm2 logs calendar-api

# Last 100 lines
pm2 logs calendar-api --lines 100
```

### Server Monitoring

**Check resource usage**:
```bash
# CPU and memory
top

# Disk space
df -h

# Network connections
netstat -an | grep 9002
```

### Uptime Monitoring

Use external monitoring services:
- **UptimeRobot** (free)
- **Pingdom**
- **StatusCake**

Configure alerts for:
- HTTP 500 errors
- High response times (>2s)
- Service downtime

### Log Aggregation

For production, use centralized logging:
- **Papertrail**
- **Loggly**
- **CloudWatch Logs** (AWS)

## Troubleshooting

### Common Issues

#### 1. API Returns 500 Errors

**Symptoms**: All requests return 500 Internal Server Error

**Solutions**:
```bash
# Check logs
pm2 logs calendar-api

# Verify environment variables
pm2 show calendar-api

# Restart service
pm2 restart calendar-api
```

#### 2. Out of Memory Errors

**Symptoms**: Server crashes with "JavaScript heap out of memory"

**Solutions**:
```bash
# Increase Node.js memory limit
node --max-old-space-size=4096 api-server.js

# Or in PM2:
pm2 start api-server.js --node-args="--max-old-space-size=4096"
```

#### 3. CORS Errors

**Symptoms**: Browser console shows CORS policy errors

**Solutions**:
```bash
# Set CORS_ORIGINS environment variable
export CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# Restart server
pm2 restart calendar-api
```

#### 4. Rate Limit Exceeded

**Symptoms**: Users getting 429 Too Many Requests

**Solutions**:
- Review rate limit settings in `rateLimiter.js`
- Increase limits for production
- Consider implementing Redis-backed rate limiting for distributed systems

#### 5. Slow Response Times

**Symptoms**: API responses take >5 seconds

**Solutions**:
- Check Claude API response times
- Optimize image processing
- Add caching for common requests
- Scale horizontally (add more servers)

### Getting Help

If you encounter issues:

1. Check server logs first
2. Review error messages carefully
3. Search existing issues on GitHub
4. Create new issue with:
   - Deployment platform
   - Error messages
   - Steps to reproduce
   - Environment details

## Scaling Strategies

### Vertical Scaling
Upgrade server resources:
- More CPU cores
- More RAM
- Faster disk I/O

### Horizontal Scaling
Add more servers:
- Load balancer (Nginx, HAProxy)
- Multiple API server instances
- Shared Redis for rate limiting
- Shared database for session storage

### Performance Optimization
- Enable gzip compression
- Use CDN for static assets
- Implement response caching
- Optimize image processing
- Use connection pooling

## Backup and Recovery

### Database Backup (when implemented)
```bash
# Backup
pg_dump database_name > backup_$(date +%Y%m%d).sql

# Restore
psql database_name < backup_20250115.sql
```

### Configuration Backup
```bash
# Backup environment variables
pm2 save
cp .env .env.backup
```

### Disaster Recovery Plan

1. **Regular backups**: Daily automated backups
2. **Backup testing**: Monthly restore tests
3. **Documentation**: Keep deployment docs updated
4. **Runbooks**: Document incident response procedures

## Cost Optimization

### Anthropic API
- Monitor usage carefully
- Implement caching where possible
- Set up billing alerts
- Use rate limiting to prevent abuse

### Server Costs
- Start with smallest instance
- Scale up based on metrics
- Use reserved instances for discounts (AWS)
- Consider spot instances for non-critical workloads

### CDN and Bandwidth
- Use CDN for static assets
- Optimize images before upload
- Enable compression
- Cache aggressively

---

## Quick Reference

### Start/Stop Commands

```bash
# PM2
pm2 start api-server.js
pm2 stop calendar-api
pm2 restart calendar-api
pm2 delete calendar-api

# Docker
docker start calendar-converter
docker stop calendar-converter
docker restart calendar-converter

# Heroku
heroku ps:scale web=1
heroku ps:scale web=0
heroku restart
```

### Check Status

```bash
# PM2
pm2 status
pm2 info calendar-api

# Docker
docker ps
docker logs calendar-converter

# Heroku
heroku ps
heroku logs --tail
```

---

**Deployment Date**: _____________
**Deployed By**: _____________
**Production URL**: _____________

---

Last updated: 2025-01-15
Version: 1.0.0

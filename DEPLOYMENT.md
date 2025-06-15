# 🚀 Deployment Guide

This guide covers different ways to deploy Repo Auditor for personal use, team use, or contribution.

## 📋 Prerequisites

### System Requirements
- **Node.js 18+** ([Download](https://nodejs.org/))
- **npm 8+** (comes with Node.js)
- **Git** ([Download](https://git-scm.com/))
- **4GB+ RAM** (for analyzing large repositories)
- **Modern web browser** (Chrome, Firefox, Safari, Edge)

### Optional Requirements
- **LLM API Key** from OpenAI, Google Gemini, or Anthropic Claude
- **GitHub Personal Access Token** (for private repos and higher rate limits)

## 🏠 Local Development

### Quick Start (5 minutes)

1. **Clone and install**
   ```bash
   git clone https://github.com/your-org/repo-auditor.git
   cd repo-auditor
   
   # Install all dependencies
   npm install
   cd backend && npm install
   cd ../frontend && npm install
   cd ..
   ```

2. **Start development servers**
   ```bash
   npm run dev
   ```

3. **Open the application**
   - Frontend: [http://localhost:5173](http://localhost:5173)
   - Backend API: [http://localhost:3001](http://localhost:3001)

### Development Configuration

Create environment files:

```bash
# Backend configuration
cd backend
cp .env.example .env
```

Edit `backend/.env`:
```bash
# LLM Configuration (optional)
OPENAI_API_KEY=sk-your-key-here
GOOGLE_AI_API_KEY=your-key-here
ANTHROPIC_API_KEY=sk-ant-your-key-here

# Server settings
PORT=3001
NODE_ENV=development

# Security
CORS_ORIGIN=http://localhost:5173
```

## 🌐 Production Deployment

### Option 1: Manual Server Deployment

1. **Prepare the server**
   ```bash
   # On your server (Ubuntu/Debian example)
   sudo apt update
   sudo apt install nodejs npm git nginx
   
   # Install PM2 for process management
   sudo npm install -g pm2
   ```

2. **Deploy the application**
   ```bash
   git clone https://github.com/your-org/repo-auditor.git
   cd repo-auditor
   
   # Install dependencies
   cd backend && npm install && npm run build
   cd ../frontend && npm install && npm run build
   ```

3. **Configure environment**
   ```bash
   cd backend
   cp .env.example .env
   # Edit .env with production values
   nano .env
   ```

4. **Start with PM2**
   ```bash
   cd backend
   pm2 start npm --name "repo-auditor-backend" -- start
   pm2 save
   pm2 startup
   ```

5. **Configure Nginx**
   ```nginx
   # /etc/nginx/sites-available/repo-auditor
   server {
       listen 80;
       server_name your-domain.com;
       
       # Frontend
       location / {
           root /path/to/repo-auditor/frontend/dist;
           try_files $uri $uri/ /index.html;
       }
       
       # Backend API
       location /api/ {
           proxy_pass http://localhost:3001;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
   }
   ```

   ```bash
   sudo ln -s /etc/nginx/sites-available/repo-auditor /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl reload nginx
   ```

### Option 2: Docker Deployment

1. **Create Dockerfile for backend**
   ```dockerfile
   # backend/Dockerfile
   FROM node:18-alpine
   WORKDIR /app
   COPY package*.json ./
   RUN npm ci --only=production
   COPY . .
   RUN npm run build
   EXPOSE 3001
   CMD ["npm", "start"]
   ```

2. **Create Dockerfile for frontend**
   ```dockerfile
   # frontend/Dockerfile
   FROM node:18-alpine as builder
   WORKDIR /app
   COPY package*.json ./
   RUN npm ci
   COPY . .
   RUN npm run build
   
   FROM nginx:alpine
   COPY --from=builder /app/dist /usr/share/nginx/html
   COPY nginx.conf /etc/nginx/conf.d/default.conf
   EXPOSE 80
   ```

3. **Create docker-compose.yml**
   ```yaml
   version: '3.8'
   services:
     backend:
       build: ./backend
       ports:
         - "3001:3001"
       environment:
         - NODE_ENV=production
         - PORT=3001
       env_file:
         - ./backend/.env
   
     frontend:
       build: ./frontend
       ports:
         - "80:80"
       depends_on:
         - backend
   ```

4. **Deploy with Docker**
   ```bash
   docker-compose up -d
   ```

### Option 3: Vercel + Railway

**Frontend on Vercel:**
1. Connect your GitHub repo to Vercel
2. Set build command: `cd frontend && npm run build`
3. Set output directory: `frontend/dist`
4. Deploy

**Backend on Railway:**
1. Connect your GitHub repo to Railway
2. Set start command: `cd backend && npm start`
3. Add environment variables
4. Deploy

### Option 4: Netlify + Heroku

**Frontend on Netlify:**
1. Connect GitHub repo
2. Build command: `cd frontend && npm run build`
3. Publish directory: `frontend/dist`
4. Deploy

**Backend on Heroku:**
```bash
# Add Heroku remote
git remote add heroku https://git.heroku.com/your-app.git

# Create Procfile in backend/
echo "web: npm start" > backend/Procfile

# Deploy
git subtree push --prefix backend heroku main
```

## 🔧 Environment Configuration

### Backend Environment Variables

| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `PORT` | Server port | `3001` | No |
| `NODE_ENV` | Environment | `production` | No |
| `OPENAI_API_KEY` | OpenAI API key | `sk-...` | No |
| `GOOGLE_AI_API_KEY` | Google AI key | `AI...` | No |
| `ANTHROPIC_API_KEY` | Claude API key | `sk-ant-...` | No |
| `CORS_ORIGIN` | Allowed origins | `https://yourdomain.com` | No |
| `LLM_MAX_TOKENS` | Max tokens per request | `1500` | No |
| `LLM_TEMPERATURE` | LLM creativity | `0.7` | No |

### Security Considerations

**Production checklist:**
- [ ] Use HTTPS in production
- [ ] Set proper CORS origins
- [ ] Use environment variables for sensitive data
- [ ] Enable rate limiting
- [ ] Regular security updates
- [ ] Monitor logs and errors

**Environment-specific settings:**
```bash
# Development
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173

# Production
NODE_ENV=production
CORS_ORIGIN=https://yourdomain.com
```

## 📊 Monitoring & Maintenance

### Health Checks

**Backend health endpoint:**
```
GET /api/health
```

**Monitoring with PM2:**
```bash
pm2 status
pm2 logs repo-auditor-backend
pm2 monit
```

### Log Management

**Structured logging setup:**
```bash
# Install winston for better logging
cd backend
npm install winston

# Configure log rotation
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 100M
pm2 set pm2-logrotate:retain 7
```

### Performance Optimization

**Backend optimizations:**
- Enable gzip compression
- Implement request caching
- Set up CDN for static assets
- Monitor memory usage

**Frontend optimizations:**
- Bundle analysis: `npm run build -- --analyze`
- Lazy loading for large components
- Image optimization
- Service worker for caching

## 🚨 Troubleshooting

### Common Issues

**Port conflicts:**
```bash
# Find process using port
lsof -i :3001
kill -9 <PID>

# Or change port
export PORT=3002
```

**Node.js version issues:**
```bash
# Use Node Version Manager
nvm install 18
nvm use 18
```

**Memory issues with large repos:**
```bash
# Increase Node.js memory limit
node --max-old-space-size=4096 server.js
```

**CORS issues:**
```bash
# Check CORS_ORIGIN in .env
CORS_ORIGIN=http://localhost:5173,https://yourdomain.com
```

### Debug Mode

Enable debug logging:
```bash
export DEBUG=repo-auditor:*
npm run dev
```

### Performance Issues

**Large repository analysis:**
- Increase timeout limits
- Consider chunked processing
- Monitor memory usage
- Implement progress indicators

## 🔄 Updates & Maintenance

### Updating the Application

```bash
# Pull latest changes
git pull origin main

# Update dependencies
cd backend && npm update
cd ../frontend && npm update

# Rebuild
npm run build

# Restart services
pm2 restart repo-auditor-backend
```

### Database Migrations

Currently, Repo Auditor is stateless and doesn't require database migrations. Analysis results are stored locally in the browser.

### Backup & Recovery

**Important files to backup:**
- Environment configuration (`.env` files)
- Custom configuration files
- SSL certificates
- Nginx configuration
- PM2 configuration

## 📈 Scaling

### Horizontal Scaling

For high-traffic deployments:
1. Load balancer (nginx, HAProxy)
2. Multiple backend instances
3. Shared session storage (Redis)
4. CDN for static assets

### Resource Requirements

| Users | CPU | RAM | Storage |
|-------|-----|-----|---------|
| 1-10 | 2 cores | 4GB | 20GB |
| 10-50 | 4 cores | 8GB | 50GB |
| 50+ | 8+ cores | 16GB+ | 100GB+ |

---

## 🆘 Getting Help

- **Documentation**: Check the main README
- **Issues**: [GitHub Issues](https://github.com/your-org/repo-auditor/issues)
- **Community**: [Discord](https://discord.gg/repo-auditor)
- **Email**: support@repo-auditor.dev

Happy deploying! 🚀

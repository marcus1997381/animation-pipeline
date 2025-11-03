# Render Deployment Guide

This guide explains how to deploy this FastAPI application to Render.

## ✅ Prerequisites

1. **Render Account**: Sign up at [render.com](https://render.com)
2. **Git Repository**: Your code should be pushed to GitHub, GitLab, or Bitbucket

## 🚀 Deployment Steps

### Option 1: Deploy via Render Dashboard (Recommended)

1. **Connect Your Repository**
   - Go to [dashboard.render.com](https://dashboard.render.com)
   - Click "New +" → "Web Service"
   - Connect your Git repository (GitHub, GitLab, or Bitbucket)
   - Select your repository and branch

2. **Configure Service Settings**
   - **Name**: `animation-pipeline` (or your preferred name)
   - **Environment**: `Python 3`
   - **Region**: Choose closest to your users
   - **Branch**: `main` (or your default branch)
   - **Root Directory**: Leave empty (or specify if needed)
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:$PORT`

3. **Set Environment Variables**
   - Go to Environment tab
   - Add: `OPENAI_API_KEY` = `your_openai_api_key_here`
   - Optional:
     - `DEBUG` = `False` (for production)
     - `PORT` = Auto-set by Render (don't override)
     - `CORS_ORIGINS` = `["*"]` or specific origins (JSON format)

4. **Deploy**
   - Click "Create Web Service"
   - Render will build and deploy your application

### Option 2: Deploy using render.yaml

If you've added the `render.yaml` file to your repository:

1. Go to Render Dashboard
2. Click "New +" → "Blueprint"
3. Connect your repository
4. Render will automatically detect and use `render.yaml`
5. Set environment variables as needed

## ⚙️ Configuration

### Build Command
```bash
pip install -r requirements.txt
```

### Start Command
```bash
gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:$PORT
```

This uses:
- **Gunicorn**: Production WSGI/ASGI server
- **Uvicorn Workers**: For async FastAPI support
- **4 Workers**: Adjust based on your needs (Render free tier: 1 worker)
- **Port**: Automatically set by Render via `$PORT` environment variable

### Environment Variables

Required:
- `OPENAI_API_KEY`: Your OpenAI API key

Optional:
- `DEBUG`: Set to `False` for production
- `CORS_ORIGINS`: JSON array of allowed origins, e.g. `["https://example.com"]` or `["*"]` for all
- `API_TITLE`, `API_VERSION`, etc.: Override defaults from `app/core/config.py`

## 📁 Static Files

Your static files are served via FastAPI routes:
- `/public/*` → Files from `public/` directory
- `/shared/*` → Files from `shared/` directory
- `/assets/*` → Files from `assets/` directory

These are served directly by the FastAPI application, so they'll work out of the box.

## 🎯 API Routes

All routes defined in `app/api/router.py` will be available:
- `GET /` → Serves `index.html`
- `GET /health` → Health check endpoint
- `GET /public/{file_path}` → Public files
- `GET /shared/{file_path}` → Shared library files
- `GET /assets/{file_path}` → Asset files (spine animations, etc.)
- `POST /api/sequence` → Main API endpoint for sequence generation

## 💰 Render Pricing

- **Free Tier**: 
  - 750 hours/month
  - Spins down after 15 minutes of inactivity
  - 512 MB RAM
  - 1 CPU

- **Starter ($7/month)**:
  - Always on
  - 512 MB RAM
  - Better for production

## 🔧 Customization

### Adjusting Workers

For the free tier (limited resources), use 1 worker:
```bash
gunicorn app.main:app -w 1 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:$PORT
```

For paid tiers, you can increase workers (2-4 recommended):
```bash
gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:$PORT
```

### Using Environment Variables for Configuration

All settings in `app/core/config.py` can be overridden via environment variables:
- `DEBUG=False`
- `CORS_ORIGINS=["https://yourdomain.com"]`
- `API_TITLE="Your App Name"`

### Custom Domain

1. Go to your service settings
2. Click "Custom Domains"
3. Add your domain
4. Follow DNS configuration instructions

## 🐛 Troubleshooting

**Issue**: Build fails
- **Fix**: Check that all dependencies are in `requirements.txt`
- Check build logs in Render dashboard

**Issue**: Service won't start
- **Fix**: Verify `OPENAI_API_KEY` is set
- Check start command matches your setup
- Review logs in Render dashboard

**Issue**: Static files not loading
- **Fix**: Ensure files exist in `public/`, `shared/`, or `assets/` directories
- Check file paths are correct

**Issue**: Timeout errors
- **Fix**: OpenAI API calls might be slow. Consider:
  - Implementing request timeouts
  - Using async handling
  - Upgrading Render plan for more resources

**Issue**: 502 Bad Gateway
- **Fix**: Check that the service is running
- Verify `$PORT` environment variable is set (Render sets this automatically)
- Review application logs

## 📊 Monitoring

- **Logs**: Available in Render dashboard under your service → "Logs"
- **Metrics**: View CPU, Memory, and Request metrics in dashboard
- **Health Checks**: Use `/health` endpoint for monitoring

## 🔄 Updating

1. Push changes to your Git repository
2. Render automatically detects changes and redeploys
3. Or manually trigger redeploy from dashboard

## 📚 Additional Resources

- [Render Documentation](https://render.com/docs)
- [Gunicorn Documentation](https://docs.gunicorn.org/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Uvicorn Workers](https://www.uvicorn.org/deployment/#gunicorn)


# Vercel Deployment Guide

This guide explains how to deploy this FastAPI application to Vercel.

## ✅ Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **Vercel CLI** (optional): `npm i -g vercel`
3. **Environment Variables**: You'll need to set `OPENAI_API_KEY` in Vercel

## 🚀 Deployment Steps

### Option 1: Deploy via Vercel Dashboard (Recommended)

1. **Connect Your Repository**
   - Go to [vercel.com/dashboard](https://vercel.com/dashboard)
   - Click "Add New Project"
   - Import your Git repository (GitHub, GitLab, or Bitbucket)

2. **Configure Project Settings**
   - **Framework Preset**: Select "Other" (or leave as default)
   - **Root Directory**: Leave as default (or specify if needed)
   - **Build Command**: Leave empty (not needed for Python)
   - **Output Directory**: Leave empty

3. **Set Environment Variables**
   - Go to Project Settings → Environment Variables
   - Add: `OPENAI_API_KEY` = `your_openai_api_key_here`
   - Apply to: Production, Preview, and Development

4. **Deploy**
   - Click "Deploy"
   - Wait for deployment to complete

### Option 2: Deploy via Vercel CLI

```bash
# Install Vercel CLI (if not already installed)
npm i -g vercel

# Login to Vercel
vercel login

# Deploy (follow prompts)
vercel

# For production deployment
vercel --prod
```

## ⚙️ Configuration Files

The following files have been added for Vercel deployment:

- **`vercel.json`**: Vercel configuration file
  - Defines serverless function builds
  - Routes API requests to Python handler
  - Serves static files from `public/`, `shared/`, and `assets/`

- **`api/index.py`**: Vercel serverless function entry point
  - Wraps your FastAPI app for Vercel's Python runtime

- **`.vercelignore`**: Files to exclude from deployment
  - Similar to `.gitignore`, but for Vercel builds

## 📝 Important Notes

### Static Files

Vercel will serve static files from:
- `/public/*` → Served directly by Vercel
- `/shared/*` → Served directly by Vercel  
- `/assets/*` → Served directly by Vercel

Your FastAPI routes for serving these files will still work, but Vercel may serve them directly for better performance.

### Environment Variables

Make sure to set these in Vercel:
- `OPENAI_API_KEY` (required)

Optional (from `app/core/config.py`):
- `DEBUG` (defaults to `True` in development)
- `HOST` (not used in serverless)
- `PORT` (not used in serverless)
- `CORS_ORIGINS` (defaults to `["*"]`)

### API Routes

All routes defined in `app/api/router.py` will be available:
- `GET /` → Serves `index.html`
- `GET /health` → Health check endpoint
- `GET /public/{file_path}` → Public files
- `GET /shared/{file_path}` → Shared library files
- `GET /assets/{file_path}` → Asset files (spine animations, etc.)
- `POST /api/sequence` → Main API endpoint for sequence generation

### Limitations

1. **File Size**: Vercel has limits on function size and execution time
   - Max function size: 50MB (after extraction)
   - Max execution time: 10s (Hobby), 60s (Pro)

2. **Cold Starts**: First request may be slower due to serverless cold starts

3. **Python Version**: Currently configured for Python 3.11

### Troubleshooting

**Issue**: `ModuleNotFoundError` during deployment
- **Fix**: Ensure all dependencies are in `requirements.txt`

**Issue**: Timeout errors
- **Fix**: OpenAI API calls might be slow. Consider implementing timeouts or async handling

**Issue**: Static files not loading
- **Fix**: Check that files exist in `public/`, `shared/`, or `assets/` directories

**Issue**: Environment variables not working
- **Fix**: Ensure they're set in Vercel dashboard and redeploy

## 🔄 Updating Dependencies

If you add new Python packages:

1. Update `requirements.txt`
2. Commit and push to your repository
3. Vercel will automatically rebuild

## 📚 Additional Resources

- [Vercel Python Documentation](https://vercel.com/docs/functions/runtimes/python)
- [Vercel Serverless Functions](https://vercel.com/docs/functions)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)


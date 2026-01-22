# Heroku Deployment Guide

This guide explains how to deploy the Lumos Angular frontend to Heroku.

## Prerequisites

1. Install Heroku CLI: https://devcenter.heroku.com/articles/heroku-cli
2. Have a Heroku account
3. Have Git installed

## Deployment Steps

### 1. Login to Heroku
```bash
heroku login
```

### 2. Create a new Heroku app (if not already created)
```bash
heroku create socratic-front
```

### 3. Set the Node.js buildpack
```bash
heroku buildpacks:set heroku/nodejs
```

### 4. Add the app to Git (if not already added)
```bash
git add .
git commit -m "Prepare for Heroku deployment"
```

### 5. Deploy to Heroku
```bash
git push heroku main
```

### 6. Open the app
```bash
heroku open
```

## Configuration

The app is configured to:
- Build the Angular app using `npm run build`
- Serve the built files using Express.js
- Handle all routes by serving `index.html` (for Angular routing)

## Environment Variables

The app uses the following environment variables:
- `PORT`: Set automatically by Heroku
- Server URL: Configured in `src/environments/environment.prod.ts`

## Troubleshooting

### Check logs
```bash
heroku logs --tail
```

### Restart the app
```bash
heroku restart
```

### Check app status
```bash
heroku ps
```

## Local Development

To test the production build locally:
```bash
npm run build
npm run heroku-start
```

The app will be available at `http://localhost:4200` 
# Heroku Deployment Guide

This guide will help you deploy your Angular application to Heroku.

## Prerequisites

1. Install Heroku CLI: https://devcenter.heroku.com/articles/heroku-cli
2. Create a Heroku account: https://signup.heroku.com/
3. Login to Heroku CLI: `heroku login`

## Deployment Steps

### 1. Initialize Git Repository (if not already done)
```bash
git init
git add .
git commit -m "Initial commit"
```

### 2. Create Heroku App
```bash
heroku create your-app-name
```

### 3. Set Buildpacks
```bash
heroku buildpacks:set heroku/nodejs
```

### 4. Deploy to Heroku
```bash
git push heroku main
```

### 5. Open Your App
```bash
heroku open
```

## Configuration Files Added

- **Procfile**: Tells Heroku how to run your app
- **server.js**: Express server to serve your Angular app
- **app.json**: Heroku app configuration
- **heroku.yml**: Advanced build configuration
- **static.json**: Static file serving configuration
- **package.json**: Updated with Heroku scripts and engines

## Environment Variables

You can set environment variables using:
```bash
heroku config:set VARIABLE_NAME=value
```

## Troubleshooting

### Common Issues:

1. **Build fails**: Check that all dependencies are in `package.json`
2. **App crashes**: Check logs with `heroku logs --tail`
3. **Static files not loading**: Ensure `dist` folder is being served correctly

### Useful Commands:

- View logs: `heroku logs --tail`
- Restart app: `heroku restart`
- Check app status: `heroku ps`
- Open app: `heroku open`

## Local Testing

Test your production build locally:
```bash
npm run build
npm start
```

Visit `http://localhost:4200` to see your app running with the production build.

## Notes

- The app uses Node.js 18.x and npm 9.x as specified in package.json
- The build process runs `npm run build` which creates the `dist` folder
- The server serves static files from the `dist` directory
- All routes are handled by serving `index.html` for Angular routing 
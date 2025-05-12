# Deployment Guide for Favour Auction

This guide outlines the steps needed to deploy the Favour Auction application to Vercel.

## Prerequisites

- [Node.js](https://nodejs.org/) (v16 or newer)
- [Vercel CLI](https://vercel.com/cli) (optional for advanced deployment options)
- A [Neon](https://neon.tech/) PostgreSQL database account

## Setup Steps

### 1. Database Setup

1. Sign up for a Neon account and create a new project
2. Find your connection string in the project dashboard
3. The database tables will be created automatically when the application starts:
   - The app checks if database tables exist on startup
   - If tables don't exist, they are created automatically
   - Default auction configuration is created
   - No default users are created - users must register themselves

   Note: You no longer need to manually run the SQL script from DB_SETUP.md

### 2. Environment Variables

Set up the following environment variables in your Vercel project settings:

```
DATABASE_URL=postgres://user:password@db.example.neon.tech/dbname?sslmode=require
ADMIN_PASSWORD=your_secure_password
SECRET_KEY=random_secure_string
```

### 3. Deployment Options

#### Option 1: Deploy with Vercel Dashboard

1. Push your code to a Git repository (GitHub, GitLab, Bitbucket)
2. Import the project in the Vercel dashboard
3. Configure environment variables in the project settings
4. Deploy

#### Option 2: Deploy with Vercel CLI

1. Install Vercel CLI: `npm i -g vercel`
2. Login: `vercel login`
3. Link your project: `vercel link`
4. Add environment variables:
   ```bash
   vercel env add DATABASE_URL
   vercel env add ADMIN_PASSWORD
   vercel env add SECRET_KEY
   ```
5. Deploy: `vercel --prod`

## Post-Deployment

After deploying, verify the following:

1. The application is accessible at your Vercel domain
2. You can log in to the admin panel
3. Users can register and participate in auctions
4. The price history charts display correctly

## Troubleshooting

- **Database Connection Issues**: Verify your `DATABASE_URL` is correct and the IP address has access
- **Chart Rendering Issues**: Check browser console for any JavaScript errors
- **Admin Access Issues**: Ensure `ADMIN_PASSWORD` is set correctly

## Updates and Maintenance

For future updates:

1. Make changes to your local codebase
2. Test thoroughly
3. Commit and push changes
4. Vercel will automatically deploy from your connected Git repository

## Known Issues

- Test files have some TypeScript issues but don't affect the actual production build
- The test suite may need DATABASE_URL set to run successfully

## Database Initialization Details

The application's database initialization process:

1. On startup, the app checks if database tables exist
2. If tables don't exist, it creates them automatically
3. It then checks if auction configuration exists:
   - If not, it creates a default configuration with English auction type
4. No default users are created during initialization
   - This ensures a clean, empty state for the auction
   - Users must register through the interface

This automatic initialization simplifies deployment and ensures the application works correctly from the first launch.
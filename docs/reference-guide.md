# Codebase Companion - Reference Guide

## Introduction

Welcome to the Codebase Companion! This application is a Next.js-based tool designed to assist developers in maintaining high-quality, consistent, and well-documented codebases. It leverages modern web technologies and AI to provide powerful features for code analysis and management.

This document serves as a comprehensive guide to the application's architecture, features, and development practices.

## Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **UI Components**: [Shadcn/UI](https://ui.shadcn.com/)
- **Database ORM**: [Prisma](https://www.prisma.io/)
- **Database**: [PostgreSQL](https://www.postgresql.org/)
- **AI/GenAI**: [Google Genkit](https://firebase.google.com/docs/genkit)
- **Deployment**: [Vercel](https://vercel.com/)

## Project Structure

```
.
├── /docs                   # Documentation files
├── /prisma                 # Prisma schema and migrations
├── /src
│   ├── /ai                 # Genkit AI flows and configuration
│   ├── /app                # Next.js App Router
│   │   ├── (components)    # Page-specific components
│   │   ├── api/            # API routes
│   │   ├── actions.ts      # Server Actions
│   │   ├── globals.css     # Global styles and Tailwind directives
│   │   ├── layout.tsx      # Root layout
│   │   └── page.tsx        # Homepage
│   ├── /components         # Shared UI components
│   │   ├── /ui             # Shadcn/UI components
│   │   └── /icons          # Custom SVG icons
│   ├── /hooks              # Custom React hooks
│   └── /lib                # Utility functions, Prisma client, etc.
├── .env.example            # Environment variable template
├── next.config.ts          # Next.js configuration
├── package.json            # Project dependencies and scripts
└── tailwind.config.ts      # Tailwind CSS configuration
```

## Core Features

### 1. AI-Powered Tool Inclusion Check

- **Description**: This feature uses a GenAI flow to scan sample code and determine if tools mentioned in your documentation have been correctly integrated.
- **Implementation**:
    - A server action (`src/app/actions.ts`) reads documentation and code files.
    - It invokes the `checkToolInclusion` Genkit flow located at `src/ai/flows/check-tool-inclusion.ts`.
    - The UI, located at `src/components/tool-inclusion-checker.tsx`, provides a button to trigger the check and displays the results.

### 2. Automated Codebase Audit

- **Description**: This feature simulates scanning the codebase for quality issues based on ESLint rules.
- **Implementation**:
    - The UI component `src/components/codebase-audit.tsx` provides a user interface for running the audit.
    - Currently, it displays mock data to demonstrate the functionality. In a full implementation, this could be connected to a service that runs ESLint programmatically.

### 3. Database Integration

- **Description**: The application is configured to use PostgreSQL with Prisma for type-safe database access.
- **Configuration**:
    - The Prisma schema is defined in `prisma/schema.prisma`.
    - The database connection string is managed via the `DATABASE_URL` environment variable (see `.env.example`).
    - A singleton Prisma Client instance is available at `src/lib/prisma.ts`.

### 4. Deployment

- **Description**: The app is optimized for deployment on Vercel.
- **Setup**:
    - The `build` script in `package.json` creates a production-ready build.
    - The `postinstall` script runs `prisma generate` to ensure the Prisma Client is up-to-date during the deployment process.
    - Environment variables (like `DATABASE_URL`) must be configured in the Vercel project settings.

## Getting Started

1.  **Clone the repository.**
2.  **Install dependencies**: `npm install`
3.  **Set up environment variables**: Copy `.env.example` to `.env` and configure your `DATABASE_URL` for PostgreSQL.
4.  **Run the development server**: `npm run dev`
5.  Open [http://localhost:9002](http://localhost:9002) in your browser.

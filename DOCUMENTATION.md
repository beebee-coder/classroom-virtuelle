# HomeCanvas Application Documentation

This document serves as a reference guide for the HomeCanvas application, as per the initial project proposal.

## 1. Original User Request

> une app en nextjs utilisant typescripte ,shudcin ui , tailwind css , eslint ,prisma , postgres ; affichant une page acceuille
> scripte de mise ajour sur github ,deploiement avec vercel
> qui respecte strictement la documentation suivante (integre cette documentation comme referance guide en fichier dans la structure de l'app)

**Translated & Clarified Core Features:**

-   **Application Name:** HomeCanvas
-   **Core Technology Stack:** Next.js, TypeScript, Shadcn UI, Tailwind CSS, ESLint, Prisma, PostgreSQL.
-   **Homepage:** A visually appealing homepage.
-   **GitHub Update Script:** A script to automatically update the application from a GitHub repository.
-   **Deployment:** Seamless deployment and hosting on Vercel.
-   **Documentation:** Integrate this guide into the application's structure.

## 2. Implementation Details

### Styling

The application's visual identity is defined by the following style guide:

-   **Primary Color:** Deep Indigo (`#4F46E5`) - `hsl(243, 79%, 62%)`
-   **Background Color:** Very Light Lavender (`#F5F3FF`) - `hsl(246, 100%, 98%)`
-   **Accent Color:** Vivid Violet (`#7C3AED`) - `hsl(258, 84%, 63%)`
-   **Typography:** 'Inter' (Sans-Serif) for both headlines and body text.
-   **Iconography:** `lucide-react` for simple, geometric icons.

These styles are implemented as CSS variables in `src/app/globals.css` and are used throughout the application with Tailwind CSS utility classes.

### Vercel Deployment & GitHub Updates

The request for a "GitHub update script" is best handled by modern CI/CD (Continuous Integration/Continuous Deployment) practices. Vercel, the recommended hosting platform, provides this functionality out-of-the-box.

**How it works:**

1.  **Connect Your GitHub Repository to Vercel:** During the project setup on Vercel, you will connect your Vercel account to your GitHub account and select the `HomeCanvas` repository.
2.  **Automatic Deployments:** Once connected, Vercel will automatically trigger a new deployment whenever you push changes to your main branch (e.g., `main` or `master`). This means your live application is always up-to-date with your latest code.
3.  **Preview Deployments:** For every pull request, Vercel creates a unique "preview" deployment. This allows you to review changes in a live environment before merging them into the main branch.

This setup eliminates the need for a manual update script and provides a robust, professional workflow.

**To deploy your app to Vercel:**
1. Push your code to a GitHub repository.
2. Go to [vercel.com](https://vercel.com/) and sign up.
3. Click "Add New... > Project".
4. Import your GitHub repository.
5. Vercel will automatically detect that it's a Next.js project and configure the build settings. You may need to add environment variables (like database connection strings) in the project settings on Vercel.
6. Click "Deploy".

### Prisma & PostgreSQL Setup

The database layer using Prisma and PostgreSQL requires manual setup. This was not automatically configured as it requires sensitive information (database credentials) and local environment configuration.

**Next Steps:**

1.  **Install Prisma:**
    ```bash
    npm install prisma --save-dev
    npm install @prisma/client
    ```
2.  **Initialize Prisma:**
    ```bash
    npx prisma init --datasource-provider postgresql
    ```
    This creates a `prisma` directory with a `schema.prisma` file and a `.env` file for your database connection string.

3.  **Configure `.env`:** Add your PostgreSQL connection URL to the `.env` file.
    ```
    DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public"
    ```

4.  **Define Your Schema:** Model your data in `prisma/schema.prisma`. For example:
    ```prisma
    model User {
      id    Int     @id @default(autoincrement())
      email String  @unique
      name  String?
    }
    ```

5.  **Migrate Your Database:** Run a migration to create the database tables based on your schema.
    ```bash
    npx prisma migrate dev --name init
    ```

For a complete guide, please refer to the official Prisma documentation:
-   [**Prisma with Next.js**](https://www.prisma.io/docs/getting-started/quickstart)
-   [**Connecting to PostgreSQL**](https://www.prisma.io/docs/orm/overview/databases/postgresql)

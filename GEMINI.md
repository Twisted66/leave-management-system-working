# Project Overview

This is a leave management system built with a modern web stack. The project is a monorepo managed with `bun` workspaces, containing a React frontend and an Encore backend.

**Frontend:**
- **Framework:** React
- **Build Tool:** Vite
- **Styling:** Tailwind CSS with Radix UI components
- **Data Fetching:** TanStack React Query
- **Routing:** React Router

**Backend:**
- **Framework:** Encore
- **Authentication:** JWT-based authentication

# Building and Running

## Prerequisites

- Install the Encore CLI:
  - **macOS:** `brew install encoredev/tap/encore`
  - **Linux:** `curl -L https://encore.dev/install.sh | bash`
  - **Windows:** `iwr https://encore.dev/install.ps1 | iex`
- Install `bun`: `npm install -g bun`

## Development

### Backend

1.  `cd backend`
2.  `encore run`

The backend will be running at `http://localhost:4000`.

### Frontend

1.  `cd frontend`
2.  `bun install`
3.  `npx vite dev`

The frontend will be running at `http://localhost:5173`.

### Generate Frontend Client

To generate the frontend client, run the following command in the `backend` directory:

```bash
encore gen client --target leap
```

# Development Conventions

- **Package Management:** This project uses `bun` for package management. Use `bun install` to install dependencies in the respective workspaces.
- **Frontend Structure:** The frontend is built with a component-based architecture. When adding new UI elements, please follow the existing structure and use the provided Radix UI components.
- **API Interaction:** The frontend interacts with the backend through a generated client. Remember to regenerate the client after making changes to the backend API.

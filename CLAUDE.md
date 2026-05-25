# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a web application with a Python/FastAPI backend and a React + TypeScript frontend. Single-user system with password stored in environment variables.

## Backend (`backend/`)

Built with **FastAPI** and served via **Uvicorn**.

- Entry point: `backend/app/main.py`
- Dependencies: `backend/requirements.txt`

### Commands

```bash
# Install dependencies
cd backend && pip install -r requirements.txt

# Run the development server
cd backend && uvicorn app.main:app --reload

# The API will be available at http://127.0.0.1:8000
# Interactive docs at http://127.0.0.1:8000/docs
```

## Frontend (`frontend/`)

Built with **React 18 + Vite + TypeScript + Tailwind CSS**.

- Routing: `react-router-dom`
- State: `zustand` (`src/store/auth.ts`)
- API: `axios` + `@tanstack/react-query` (`src/api/client.ts`)
- Auth: login compares against `VITE_USER` / `VITE_PASSWORD` env vars, stores base64 token in `localStorage`

### Commands

```bash
# Install dependencies
cd frontend && npm install

# Run the development server
cd frontend && npm run dev
# Frontend will be at http://localhost:5173
```

### Environment Variables

Copy `.env.example` to `.env` and set:
- `VITE_API_URL` — FastAPI backend URL (default: `http://127.0.0.1:8000`)
- `VITE_USER` — login username
- `VITE_PASSWORD` — login password

## License

Apache License 2.0
# Agent Observability Platform - Frontend

A modern, minimalistic React frontend for the Agent Observability Platform.

## Features

- 💬 Clean chat interface for interacting with the AI agent
- 📤 Image upload support with real-time classification
- 🎨 Professional gradient design
- 📱 Responsive layout
- ⚡ Built with Vite for fast development

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Backend API running on port 8000

### Installation

```bash
cd frontend
npm install
```

### Development

```bash
npm run dev
```

The frontend will be available at `http://localhost:3000`

### Build for Production

```bash
npm run build
```

The built files will be in the `dist/` directory.

## API Endpoints

The frontend communicates with these backend endpoints:

- `POST /query` - Send text queries to the agent
- `POST /upload-photo` - Upload and classify photos (passport/driver's license)

## Technologies

- **React 18** - UI framework
- **Vite** - Build tool and dev server
- **Lucide React** - Icon library
- **CSS3** - Styling with gradients and animations

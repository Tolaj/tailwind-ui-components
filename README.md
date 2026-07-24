# Windcraft

A component library platform for browsing, creating, and sharing Tailwind CSS UI components. Built with Node.js, Express, Handlebars, and MongoDB.

![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-5-000000?logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-7-47A248?logo=mongodb&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3-06B6D4?logo=tailwindcss&logoColor=white)

## Features

- **Component Library** — Browse UI components organized by category (Hero Sections, Cards, Blog, FAQ, Team, Testimonials, etc.)
- **Live Playground** — Create and edit components with a split-pane editor featuring live HTML preview, mobile/desktop toggle, and light/dark theme switching
- **AI-Powered Generation** — Describe a component in natural language and generate it using Anthropic Claude or a local LLM (configurable per user)
- **User Accounts** — Sign up, sign in, and manage your own components
- **LLM Settings** — Configure your preferred AI provider (Anthropic API or self-hosted local LLM) from the settings modal
- **Skeleton Loading** — Shimmer placeholder cards shown while the page loads
- **Responsive Design** — Fully responsive layout with collapsible sidebar navigation

## Tech Stack

| Layer       | Technology                          |
|-------------|-------------------------------------|
| Runtime     | Node.js 18+                        |
| Framework   | Express 5                           |
| Templating  | Express Handlebars                  |
| Database    | MongoDB with Mongoose 7             |
| Sessions    | express-session + connect-mongo     |
| Styling     | Tailwind CSS (CDN)                  |
| AI          | Anthropic SDK / OpenAI-compatible   |

## Prerequisites

- Node.js 18 or higher
- MongoDB (local or Atlas)

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/your-username/windcraft.git
cd windcraft
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

Copy the example env file and fill in your values:

```bash
cp .env.example .env
```

| Variable              | Description                              | Required |
|-----------------------|------------------------------------------|----------|
| `MONGO_URI`           | MongoDB connection string                | Yes      |
| `PORT`                | Server port (default: 3000)              | No       |
| `SESSION_SECRET`      | Secret for session encryption            | Yes      |
| `ANTHROPIC_API_KEY`   | Anthropic API key (for server fallback)  | No       |
| `LLM_URL`             | Local LLM endpoint URL                   | No       |

### 4. Start the development server

```bash
npm run dev
```

The app will be available at `http://localhost:3000`.

### 5. Start for production

```bash
npm start
```

## Project Structure

```
src/
├── app.js                    # Express app setup, middleware, Handlebars config
├── server.js                 # Entry point — connects DB and starts server
├── config/
│   ├── mongoConnection.js    # Mongoose connection with pooling
│   └── settings.js           # App configuration
├── controllers/
│   ├── component.controller.js
│   └── user.controller.js
├── middlewares/
│   ├── auth.js               # ensureAuth & ensureAuthAPI guards
│   └── sessionConfig.js      # Session store with connect-mongo
├── models/
│   ├── component.model.js    # Component schema (title, category, htmlCode, views, likes)
│   └── user.model.js         # User schema with LLM settings subdocument
├── routes/
│   ├── index.js              # Route aggregator
│   ├── home.routes.js        # Home page, category pages, component detail
│   ├── auth.routes.js        # Sign-in, sign-up, sign-out pages
│   ├── user.routes.js        # User API + LLM settings endpoints
│   ├── component.routes.js   # Component CRUD API
│   └── ai.routes.js          # AI generation endpoint (SSE streaming)
├── services/
│   └── user.service.js       # User data access layer
├── views/
│   ├── layouts/
│   │   ├── main.handlebars   # Dashboard layout
│   │   └── auth.handlebars   # Auth pages layout
│   ├── main/
│   │   ├── home.handlebars   # Home page with category grid + skeleton loader
│   │   ├── category-detail.handlebars
│   │   └── component-detail.handlebars
│   ├── auth/
│   │   ├── signin.handlebars
│   │   └── signup.handlebars
│   └── partials/
│       ├── header.handlebars
│       ├── sidebar.handlebars
│       ├── settings-modal.handlebars
│       └── component-playground/
│           ├── index.handlebars       # Editor dialog wrapper
│           ├── editor-panel.handlebars
│           ├── preview-panel.handlebars
│           ├── details-panel.handlebars
│           └── ai-chatbox.handlebars
└── public/
    ├── css/
    │   └── style.css         # Custom styles + skeleton animation
    ├── images/
    └── js/
        ├── main.js           # Sidebar toggle, search, category filter
        ├── settings.js       # LLM settings modal logic
        ├── utils.js          # Toast notifications
        ├── theme.js          # Theme color customization
        └── playground/
            ├── playground.js         # Editor orchestration
            ├── playground-editor.js  # Code editor logic
            ├── playground-preview.js # Live preview rendering
            └── playground-ai.js      # AI streaming integration
```

## API Endpoints

### Auth

| Method | Endpoint          | Description      |
|--------|-------------------|------------------|
| GET    | `/auth/sign-in`   | Sign-in page     |
| GET    | `/auth/sign-up`   | Sign-up page     |
| GET    | `/auth/sign-out`  | Sign out         |

### Users

| Method | Endpoint              | Auth | Description              |
|--------|-----------------------|------|--------------------------|
| POST   | `/users`              | No   | Create account           |
| POST   | `/users/sign-in`      | No   | Sign in                  |
| GET    | `/users/settings/llm` | Yes  | Get LLM settings         |
| PUT    | `/users/settings/llm` | Yes  | Update LLM settings      |

### Components

| Method | Endpoint              | Auth | Description              |
|--------|-----------------------|------|--------------------------|
| POST   | `/components`         | Yes  | Create component         |
| GET    | `/components/:id`     | No   | Get component by ID      |
| PUT    | `/components/:id`     | Yes  | Update component         |
| DELETE | `/components/:id`     | Yes  | Delete component         |

### AI

| Method | Endpoint                     | Auth | Description                           |
|--------|------------------------------|------|---------------------------------------|
| POST   | `/api/ai/generate-stream`    | Yes  | Generate component via SSE streaming  |

## AI Integration

Windcraft supports two AI providers for component generation:

**Anthropic (Claude)** — Uses the Anthropic SDK with your API key. Set your key in the Settings modal or via the `ANTHROPIC_API_KEY` env variable.

**Local LLM** — Any OpenAI-compatible server exposing a `/v1/chat/completions` endpoint (e.g., Ollama, LM Studio, vLLM). Configure the URL in the Settings modal.

AI settings are stored per-user in the database. The AI chatbox in the component editor only appears when AI is enabled in settings.

## Scripts

| Script          | Command          | Description                      |
|-----------------|------------------|----------------------------------|
| `npm run dev`   | `nodemon`        | Start dev server with hot reload |
| `npm start`     | `node`           | Start production server          |

## License

ISC

## Author

Swapnil Jadhav

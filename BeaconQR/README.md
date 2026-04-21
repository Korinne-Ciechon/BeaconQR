# CIM343/643 Express App

An Express.js web application built with Handlebars templating, Sequelize ORM, and SQLite — featuring task management, list management, a color poll with Chart.js, and a p5.js visualization.

## Getting Started

```bash
npm install
npm start
```

The app runs on `http://localhost:3000` by default (configured in `bin/www`).

---

## Tech Stack

| Layer | Technology |
|---|---|
| Web framework | Express 4 |
| Templating | Handlebars (hbs) |
| ORM | Sequelize 6 |
| Database | SQLite (stored at `../data/database.sqlite`) |
| Logging | Morgan (dev mode) |

---

## Database Models

Defined in [app.js](app.js) using Sequelize and auto-synced on startup with `alter: true` (adds missing columns without dropping data).

### List
| Field | Type | Notes |
|---|---|---|
| `name` | STRING | Required |
| `Tasks` | Task[] | One-to-many association |

### Task
| Field | Type | Notes |
|---|---|---|
| `name` | STRING | Required |
| `description` | TEXT | Optional |
| `ListId` | FK | Belongs to a List; deleted when parent List is deleted (CASCADE) |

### Poll
| Field | Type | Notes |
|---|---|---|
| `color` | STRING | Required |
| `amount` | INTEGER | Vote count, defaults to 0 |

---

## Routes

### General Pages

| Method | Path | Description |
|---|---|---|
| GET | `/` | Home page (`index.hbs`) |
| GET | `/page2` | Second static page (`page2.hbs`) |
| GET | `/parameters/:name` | Renders `index.hbs` with `:name` as the page title |
| GET | `/form` | Renders a generic form page (`form.hbs`) |

---

### Tasks

| Method | Path | Description |
|---|---|---|
| GET | `/addtask` | Renders the add-task form (`addtask.hbs`) |
| POST | `/addtask` | Creates a new Task from `req.body.name` and `req.body.description`; renders `task_submitted.hbs` on success |
| GET | `/tasks` | Returns all tasks as **JSON**, ordered newest-first |
| GET | `/taskspage` | Renders all tasks as an **HTML page** (`taskspage.hbs`), ordered newest-first |
| POST | `/tasks/:id/delete` | Deletes the Task with the given `id` and redirects to `/taskspage` |

---

### Lists

| Method | Path | Description |
|---|---|---|
| GET | `/addlist` | Renders the add-list form (`addlist.hbs`) |
| POST | `/addlist` | Creates a new List (with nested Tasks) from the JSON body; returns the created List as JSON |
| GET | `/lists` | Fetches all Lists with their associated Tasks and renders `viewlists.hbs` |

---

### Poll / Charts

| Method | Path | Description |
|---|---|---|
| GET | `/chart` | Fetches all Poll entries and renders `charts.hbs` (Chart.js visualization); passes `pollJSON` for client-side use |
| POST | `/chart` | Receives `req.body.color`; increments the vote count for that color (or creates a new entry at 1); redirects to `/chart` |
| GET | `/p5` | Fetches Poll data and renders `p5js.hbs` (p5.js visualization); passes `pollJSON` for client-side use |

---

### Utility / Admin

| Method | Path | Description |
|---|---|---|
| GET | `/delete-all` | Destroys **all** Lists and Tasks in the database; returns a JSON confirmation message |

> **Warning:** `/delete-all` is a destructive endpoint with no authentication guard. It should be removed or protected before any production deployment.

---

## Views & Partials

All templates are Handlebars (`.hbs`) files located in [views/](views/).

| Template | Used by |
|---|---|
| `layout.hbs` | Shared layout wrapper for all pages |
| `index.hbs` | `/` and `/parameters/:name` |
| `page2.hbs` | `/page2` |
| `form.hbs` | `/form` |
| `addtask.hbs` | `GET /addtask` |
| `task_submitted.hbs` | `POST /addtask` |
| `taskspage.hbs` | `GET /taskspage` |
| `addlist.hbs` | `GET /addlist` |
| `viewlists.hbs` | `GET /lists` |
| `charts.hbs` | `GET /chart` |
| `p5js.hbs` | `GET /p5` |
| `error.hbs` | Error handler |
| `partials/header.hbs` | Registered partial |
| `partials/footer.hbs` | Registered partial |

### Registered HBS Helpers

| Helper | Usage | Description |
|---|---|---|
| `eq` | `{{#if (eq v1 v2)}}` | Strict equality check (`===`) for use in conditionals |

---

## Middleware Stack

Configured in [app.js](app.js) in this order:

1. `morgan('dev')` — HTTP request logger
2. `express.json()` — Parses JSON request bodies
3. `express.urlencoded({ extended: false/true })` — Parses URL-encoded form bodies
4. `cookieParser()` — Parses cookies
5. `express.static('public')` — Serves static files from [public/](public/)
6. 404 catch-all — Forwards unmatched routes to the error handler
7. Error handler — Renders `error.hbs` with message and stack (stack shown in development only)

---

## Project Structure

```
.
├── app.js              # Main application file (models, routes, middleware)
├── bin/www             # HTTP server entry point
├── package.json
├── fix_db.js           # Utility script for database fixes
├── public/
│   ├── stylesheets/style.css
│   └── javascripts/sketch.js   # p5.js sketch
├── views/              # Handlebars templates
│   └── partials/       # Shared header/footer partials
└── data/
    └── database.sqlite # SQLite database file (outside repo root)
```

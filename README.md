# Learnability Backend API

**AI-Powered Backend for Personalized & Accessible Education**

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)

<!-- Add other relevant badges here, e.g., build status -->

**Addressing UN Sustainable Development Goal 4: Quality Education through innovative technology.**

---

## Table of Contents

- [The Problem: Barriers to Quality Education](#the-problem-barriers-to-quality-education)
- [Our Solution: Learnability](#our-solution-learnability)
- [Impact & SDG Alignment (Goal 4)](#impact--sdg-alignment-goal-4)
- [Key Features](#key-features)
- [Architecture](#architecture)
- [Technologies Used](#technologies-used)
- [API Documentation](#api-documentation)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Setup with Docker (Recommended)](#setup-with-docker-recommended)
  - [Manual Setup](#manual-setup)
  - [Running the Application](#running-the-application)
- [Project Structure](#project-structure)
- [License](#license)

---

## The Problem: Barriers to Quality Education

Achieving UN SDG 4 (Quality Education) faces significant hurdles:

- **Unequal Access (Target 4.3):** Creating high-quality, tailored educational materials can be time-consuming and costly, limiting access, especially in resource-constrained environments.
- **Skills Gap (Target 4.4):** Learners often struggle to find personalized learning paths and receive timely feedback to acquire skills relevant for employment and personal growth.
- **Information Overload (Target 4.7):** Navigating vast amounts of information to find contextually relevant knowledge can be overwhelming, hindering deep understanding and the development of skills needed for sustainable development.

---

## Our Solution: Learnability

Learnability provides a robust backend API designed to power personalized and engaging learning platforms, directly addressing these challenges:

- **AI-Powered Content Generation:** Leverages Google's Gemini AI to automatically generate diverse lesson content, quizzes, and summaries from uploaded materials (like syllabi), significantly reducing the effort and cost of content creation.
- **Personalized Learning Feed:** Tracks user progress (streaks, completed lessons, quiz scores) and provides a tailored feed, helping users focus on relevant skills and stay motivated.
- **Intelligent Search:** Integrates Milvus vector database for powerful semantic search, enabling learners to intuitively discover contextually relevant information within their study materials.

By automating content creation, personalizing the learning journey, and simplifying information discovery, Learnability aims to make quality education more scalable, accessible, and effective.

---

## Impact & SDG Alignment (Goal 4)

Learnability directly contributes to **SDG 4: Quality Education**:

- **Target 4.3 (Equal Access):** AI content generation lowers barriers to creating and accessing quality educational resources.
- **Target 4.4 (Relevant Skills):** Personalized feeds and progress tracking support focused skill development with immediate feedback loops via AI-generated quizzes.
- **Target 4.7 (Knowledge for Sustainable Development):** Semantic search fosters deeper understanding and efficient knowledge acquisition, promoting lifelong learning.

---

## Key Features

### 🚀 User Management

_Benefit: Secure and personalized user experience._

- **User Authentication:** Secure registration, login, and profile management using JWT.
- **User Progress Tracking:** Monitor study streaks, completed lessons, weekly progress, and quiz performance for tailored feedback.

### 📚 Content Management

_Benefit: Streamlined creation and organization of learning materials._

- **Subject Management:** Organize and manage educational subjects.
- **Material Uploads:** Support for diverse materials (PDFs, images, text, etc.).
- **Lesson Generation:** Automatic lesson creation from syllabus documents.
- **Detailed Lesson Content:** Generate multi-page lesson content with headings, text, code, quizzes, and more.
- **Quiz Generation & Management:** Create and manage quizzes with varied question types and difficulty levels.

### 🤖 AI-Powered Capabilities

_Benefit: Reduces content creation time and enables dynamic learning experiences._

- **Content Creation:** Leverage Google's Gemini AI for:
  - Extracting text from documents.
  - Generating lesson content from syllabi.
  - Creating detailed lesson plans.
  - Producing quiz questions.

### 🔍 Search Capabilities

_Benefit: Intuitive and relevant information discovery._

- **Vector Search:** Semantic search powered by Milvus for contextually relevant content discovery.

### 📊 Analytics

_Benefit: Insights into learning effectiveness._

- **Quiz Analytics:** Track performance on quizzes to identify areas for improvement.

### ⚙️ Other Features

- **RESTful API:** Fully-featured API to interact with every aspect of the platform.
- **Personalized Feed:** Delivers relevant content and tasks based on user progress.

---

## Architecture

The Learnability backend follows a modular architecture:

```mermaid
flowchart LR
    User --> API[Express API Gateway]
    API --> Auth[Auth Middleware JWT]
    Auth --> Routes[API Routes]
    Routes --> Handlers[Request Handlers]
    Handlers --> Services[Business Logic Services]
    Services --> Gemini[Gemini AI Service]
    Services --> Milvus[Milvus Service]
    Services --> Quiz[Quiz Service]
    Services --> Stats[Stats Service]
    Services --> Prisma[Prisma ORM]
    Prisma --> DB[(PostgreSQL DB)]
    Milvus --> MilvusDB[(Milvus Vector DB)]
    Gemini --> VertexAI[Google Vertex AI]

    style API fill:#f9f,stroke:#333,stroke-width:2px
    style DB fill:#ccf,stroke:#333,stroke-width:2px
    style MilvusDB fill:#cdf,stroke:#333,stroke-width:2px
    style VertexAI fill:#fca,stroke:#333,stroke-width:2px
```

- **User Interaction:** Users interact via a frontend (or directly) with the Express API.
- **Request Handling:** Requests pass through authentication middleware, are routed to specific handlers, which then call appropriate services for business logic.
- **Data & AI:** Services utilize Prisma ORM for PostgreSQL interactions, Milvus for vector search, and Gemini AI for content generation.

---

## Technologies Used

- **TypeScript:**
- **Node.js & Express.js:**
- **Prisma:**
- **PostgreSQL:**
- **JWT (JSON Web Tokens):**
- **Google Vertex AI (Gemini):**
- **Milvus:**
- **Docker & Docker Compose:**

---

## API Documentation

The API provides comprehensive endpoints for managing users, content, quizzes, stats, and search.

_(**Note:** For detailed interactive documentation, consider generating and hosting Swagger/OpenAPI docs or providing a Postman collection.)_

### Endpoints Overview

#### Auth (`/api/v1/auth`)

- `POST /register` — Register a new user.
- `POST /login` — User login.
- `POST /logout` — Logout.
- `GET /me` — Retrieve user profile.

#### Stats (`/api/v1/stats`)

- `GET /` — Retrieve user learning stats.
- `POST /lesson/:lessonId/complete` — Mark a lesson as completed.
- `POST /track` — Track study activity.
- `POST /quiz` — Update quiz score.

#### Pyos (Subjects, Sources, Lessons) (`/api/v1/pyos`)

- `GET /subjects` — Get all subjects.
- `POST /subjects` — Create a new subject.
- `GET /subjects/:id` — Retrieve a specific subject.
- `DELETE /subjects/:id` — Delete a subject.
- `POST /subjects/syllabus` — Upload a syllabus (triggers lesson generation).
- `GET /subjects/:subjectId/syllabus` — Retrieve a subject's syllabus.
- `GET /subjects/:subjectId/lessons` — Get generated lessons for a subject.
- `GET /:subjectId/:lessonId` — Generate detailed content for a specific lesson.
- `GET /materials` — Get all data sources (uploaded materials).
- `GET /materials/:id` — Retrieve a data source.
- `DELETE /materials/:id` — Delete a data source.
- `POST /materials` — Create a new data source (upload material).

#### Quiz (`/api/v1/quiz`)

- `GET /` — Retrieve all quizzes (metadata).
- `GET /:id` — Get a specific quiz (including questions).
- `POST /` — Create a new quiz manually.
- `POST /generate` — Generate a quiz using AI based on criteria.
- `DELETE /:id` — Delete a quiz.
- `POST /:id/attempt` — Submit a quiz attempt.
- `GET /:id/attempts` — Retrieve attempts for a specific quiz.

#### Analytics (`/api/v1/analytics`)

- `GET /quizzes` — Retrieve aggregated user quiz analytics.
- `GET /quizzes/:id` — Get analytics for a specific quiz.

#### Search (`/api/v1/query`)

- `POST /` — Perform semantic search across materials using Milvus.

#### Feed (`/api/v1/feed`)

- `GET /` — Retrieve the personalized user learning feed.

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (LTS version recommended, e.g., v18 or v20)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)
- [Docker](https://www.docker.com/get-started) and [Docker Compose](https://docs.docker.com/compose/install/)
- [Git](https://git-scm.com/)

### Setup with Docker (Recommended)

This is the easiest way to get the entire stack (API, PostgreSQL, Milvus) running.

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd learnability-backend
    ```
2.  **Create Environment File:**
    Copy the example environment file and fill in your specific values:
    ```bash
    cp .env.example .env
    ```
    - Edit `.env` with your `JWT_SECRET`, `GOOGLE_CLOUD_PROJECT` ID, and any other necessary credentials. The `DATABASE_URL` is typically configured within the Docker Compose setup for the Postgres service. Ensure the database host in `DATABASE_URL` matches the Postgres service name in `docker-compose.yml` (e.g., `postgresql://user:password@postgres:5432/mydb`).
3.  **Build and Run Services:**

    ```bash
    # Navigate to the docker-compose directory for Postgres
    cd docker/docker-compose-postgres
    docker-compose up -d # Start Postgres in detached mode

    # Navigate to the docker-compose directory for Milvus
    cd ../docker-compose-vectordb
    docker-compose up -d # Start Milvus in detached mode

    # Navigate back to the project root
    cd ../..
    ```

4.  **Install API Dependencies:**
    ```bash
    npm install
    ```
5.  **Run Database Migrations:**
    This sets up the necessary tables in the PostgreSQL database.
    ```bash
    npx prisma migrate dev --name init
    ```
6.  **Run the API (See [Running the Application](#running-the-application))**

### Manual Setup

Follow these steps if you prefer not to use Docker for databases.

1.  **Clone & Install Dependencies:**
    ```bash
    git clone <repository-url>
    cd learnability-backend
    npm install
    ```
2.  **Setup PostgreSQL:** Ensure you have a running PostgreSQL instance accessible.
3.  **Setup Milvus:** Ensure you have a running Milvus instance accessible (Default: `localhost:19530`).
4.  **Create Environment File:**
    ```bash
    cp .env.example .env
    ```
    - Edit `.env` with your `JWT_SECRET`, `GOOGLE_CLOUD_PROJECT` ID, and the correct `DATABASE_URL` for your manually configured PostgreSQL instance.
5.  **Run Database Migrations:**
    ```bash
    npx prisma migrate dev --name init
    ```

### Running the Application

Start the backend API server:

```bash
npm run dev
```

The API should now be running, typically on `http://localhost:3000` (or the port specified in your environment).

---

## Project Structure

```
.
├── docker/             # Docker configurations for services (Postgres, Milvus)
├── prisma/             # Prisma schema, migrations, client setup
│   ├── migrations/     # Database migration history
│   └── schema.prisma   # Defines database models and relations
├── src/                # Source code
│   ├── db/             # Database connection setup (using Prisma client)
│   ├── handler/        # Request handlers (controllers) for API routes
│   ├── middleware/     # Express middleware (auth, validation, uploads)
│   ├── routes/         # API route definitions
│   ├── schemas/        # Zod schemas for request validation
│   ├── services/       # Business logic, interactions with DB and external APIs (Gemini, Milvus)
│   ├── utils/          # Utility functions
│   ├── webhook/        # Webhook handlers (if any)
│   └── index.ts        # Main application entry point
├── .env.example        # Example environment variables
├── .gitignore          # Files ignored by Git
├── package.json        # Project dependencies and scripts
├── README.md           # This file
└── tsconfig.json       # TypeScript compiler options
```

---

## License

This project is licensed under the **GNU General Public License v3.0**. See the [LICENSE](LICENSE) file for details.

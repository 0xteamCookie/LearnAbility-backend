import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { authRoutes } from './routes/auth.routes';
import { statsRoutes } from './routes/stats.routes';
import { dataSourceRoutes } from './routes/source.routes';
import { queryRoutes } from './routes/query.routes';
import { feedRoutes } from './routes/feed.routes';
import { pyosRoutes } from './routes/pyos.routes';
import { webhookRoutes } from './webhook/navigation';
import { quizRoutes } from './routes/quiz.routes';
import { analyticsRoutes } from './routes/analytics.routes';
import placeholderHandler from './handler/placeholder.handler';

dotenv.config();

// Swagger definition
const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Learnability Backend API',
    version: '1.0.0',
    description: 'Backend API for the Learnability personalized learning platform. Features user management, content management, AI-powered lesson/quiz generation, and semantic search.',
    license: {
      name: 'GNU GPLv3',
      url: 'https://www.gnu.org/licenses/gpl-3.0.en.html', // Assuming based on README
    },
  },
  servers: [
    {
      url: `http://localhost:${process.env.PORT || 30000}/api/v1`,
      description: 'Development server',
    },
    // Add other servers like production here if applicable
  ],
  // Optional: Define security schemes like JWT
  components: {
    securitySchemes: {
      bearerAuth: { // Can be any name
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT', // Optional
      },
    },
  },
  security: [
    {
      bearerAuth: [], // Apply JWT globally
    },
  ],
};

// Options for swagger-jsdoc
const options = {
  swaggerDefinition,
  // Paths to files containing OpenAPI definitions (your route files)
  apis: ['./src/routes/*.ts'],
};

// Initialize swagger-jsdoc
const swaggerSpec = swaggerJsdoc(options);

const app = express();
app.use(cookieParser());

app.use(express.json());
app.use(
  cors({
    origin: '*', //For testing only
    credentials: true, // allow sending cookies
  })
);

app.use('/api/v1/stats', statsRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/data-sources', dataSourceRoutes);
app.use('/api/v1/user-query', queryRoutes);
app.use('/api/v1/feed', feedRoutes);
app.use('/api/v1/pyos', pyosRoutes);
app.use('/webhook', webhookRoutes);
app.use('/api/v1/quizzes', quizRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.get('/placeholder.svg', placeholderHandler.getSVG);

// Serve Swagger docs
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Optional: Redirect root to API docs for convenience
app.get('/', (req, res) => {
  res.redirect('/api-docs');
});


const PORT = process.env.PORT || 30000;

app.listen(PORT, () => {
  console.log(`Server is running on port http://localhost:${PORT}`);
});

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
import { translationRoutes } from './routes/translation.routes';
import placeholderHandler from './handler/placeholder.handler';

dotenv.config();

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Learnability Backend API',
    version: '1.0.0',
    description:
      'Backend API for the Learnability personalized learning platform. Features user management, content management, AI-powered lesson/quiz generation, and semantic search.',
    license: {
      name: 'GNU GPLv3',
      url: 'https://www.gnu.org/licenses/gpl-3.0.en.html',
    },
  },
  servers: [
    {
      url: `http://localhost:${process.env.PORT || 30000}/api/v1`,
      description: 'Development server',
    },
  ],

  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
  },
  security: [
    {
      bearerAuth: [],
    },
  ],
};

const options = {
  swaggerDefinition,

  apis: ['./src/routes/*.ts', './src/schemas/*.ts'],
};

const swaggerSpec = swaggerJsdoc(options);

const app = express();
app.use(cookieParser());

app.use(express.json());
app.use(
  cors({
    origin: '*', //For testing only
    credentials: true,
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
app.use('/api/v1/translations', translationRoutes);
app.get('/placeholder.svg', placeholderHandler.getSVG);

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

const PORT = process.env.PORT || 30000;

app.listen(PORT, () => {
  console.log(`Server is running on port http://localhost:${PORT}`);
});

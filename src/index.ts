import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { authRoutes } from './routes/auth.routes';
import { dataSourceRoutes } from './routes/source.routes';

dotenv.config();

const app = express();

app.use(express.json());
app.use(cors());

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/data-sources', dataSourceRoutes);

const PORT = process.env.PORT || 30000;

app.listen(PORT, () => {
  console.log(`Server is running on port http://localhost:${PORT}`);
});

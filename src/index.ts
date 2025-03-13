import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { testRoutes } from "./routes/datasources.routes";

dotenv.config();

const app = express();

app.use(express.json());
app.use(cors());

app.use("/api/v1", testRoutes);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server is running on port http://localhost:${PORT}`);
});

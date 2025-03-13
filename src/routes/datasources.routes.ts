import { Router } from "express";
import { testFn } from "../handler/datasources.handler";

const router = Router();

router.get("/", testFn);

export { router as testRoutes };

import { Router, Request, Response } from 'express';

const router = Router();

router.post('/', async (req: Request, res: Response) => {
  try {
    const { message } = req.body;

    const { type = 'function-call', functionCall = {} } = message;

    if (type === 'function-call' && functionCall?.name === 'navigate') {
      const parameters = functionCall?.parameters;
      const path: string | undefined = parameters?.path;

      if (!path) {
        return void res.status(400).json({ error: 'Missing path parameter' });
      }

      console.log(`Navigating to: ${path}`);

      return void res.json({
        success: true,
        navigate_to: path,
      });
    }

    return void res.status(400).json({ error: 'Unknown function call' });
  } catch (err) {
    console.error('Error handling webhook:', err);
    return void res.status(500).json({ message: 'Internal Server Error' });
  }
});

export { router as webhookRoutes };

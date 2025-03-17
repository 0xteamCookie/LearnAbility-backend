import { Request, Response } from 'express';
import { resetMilvusIndex } from '../services/milvus';

/**
 * @desc Reset Milvus index
 * @route POST /api/v1/admin/reset-milvus-index
 * @protected Admin only
 */
export const resetMilvusIndexHandler = async (req: Request, res: Response) => {
  try {
    const result = await resetMilvusIndex();

    if (result.success) {
      return void res.json({
        success: true,
        message: result.message,
      });
    } else {
      return void res.status(500).json({
        success: false,
        message: result.message,
      });
    }
  } catch (error) {
    console.error('Error in reset Milvus index handler:', error);
    return void res.status(500).json({
      success: false,
      message: 'Failed to reset Milvus index',
      error: (error as Error).message,
    });
  }
};

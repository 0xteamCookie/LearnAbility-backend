import { Request, Response } from "express";

export const testFn = async (request: Request, response: Response) => {
  try {
    return void response.status(201).json({
      success: true,
      message: "OK",
    });
  } catch (error) {
    console.log(error);
    return void response.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

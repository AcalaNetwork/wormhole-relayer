import { NextFunction, Request, Response } from 'express';
import { ValidationError } from 'yup';

export class NoRouteError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NoRouteError';
  }
}

export const errorHandler = (err: unknown, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof ValidationError) {
    res.status(400).json({
      error: err.errors,
      msg: 'invalid request params!',
    });
  } else if (err instanceof NoRouteError) {
    res.status(404).json({
      error: err.message,
      msg: 'no route found!',
    });
  } else if (err instanceof Error) {
    res.status(500).json({
      error: err.message,
      msg: `internal server error: ${err.name}`,
    });
  } else {
    res.status(500).json({
      error: JSON.stringify(err),
      msg: 'internal server error',
    });
  }
};

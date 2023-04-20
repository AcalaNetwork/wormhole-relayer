import { NextFunction, Request, Response } from 'express';
import { ValidationError } from 'yup';

export class NoRouteError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NoRouteError';
  }
}

/* --------------------
   we use a consistent 200 for all responses to mark a "successfull conversation"
   so the request itself won't throw. Error details can be found by res.data.error
                                                              -------------------- */
export const errorHandler = (err: unknown, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof ValidationError) {
    res.status(200).json({
      error: err.errors,
      msg: 'invalid request params!',
    });
  } else if (err instanceof NoRouteError) {
    res.status(200).json({
      error: err.message,
      msg: 'no route found!',
    });
  } else if (err instanceof Error) {
    res.status(200).json({
      error: err.message,
      msg: `internal server error: ${err.name}`,
    });
  } else {
    res.status(200).json({
      error: JSON.stringify(err),
      msg: 'internal server error',
    });
  }
};

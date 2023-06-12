import { NextFunction, Request, Response } from 'express';
import { ValidationError } from 'yup';

export class NoRouteError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NoRouteError';
  }
}

export class RelayError extends Error {
  params: any;

  constructor(message: string, params?: any) {
    super(message);
    this.name = 'RelayError';
    this.params = params;
  }
};

export const errorHandler = (err: unknown, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof ValidationError) {
    res.status(400).json({
      msg: 'invalid request params!',
      error: err.errors,
    });
  } else if (err instanceof NoRouteError) {
    res.status(404).json({
      msg: 'no route found!',
      error: err.message,
    });
  } else if (err instanceof RelayError) {
    res.status(500).json({
      msg: 'cannot relay this request!',
      error: err.message,
      params: err.params,
    });
  } else if (err instanceof Error) {
    res.status(500).json({
      msg: `internal server error: ${err.name}`,
      error: err.message,
    });
  } else {
    res.status(500).json({
      msg: 'internal server error',
      error: JSON.stringify(err),
    });
  }
};

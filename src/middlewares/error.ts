import { NextFunction, Request, Response } from 'express';
import { ValidationError } from 'yup';

import { NoRouteError, RelayError, RelayerError, RouteError } from '../utils';

export const errorHandler = (err: unknown, req: Request, res: Response, _next: NextFunction) => {
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
  } else if (err instanceof RouteError) {
    res.status(500).json({
      msg: 'cannot route this request!',
      error: err.message,
      params: err.params,
    });
  } else if (err instanceof RelayerError) {
    res.status(500).json({
      msg: 'an error occurred!',
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
      msg: 'unknown internal server error',
      error: JSON.stringify(err),
    });
  }
};

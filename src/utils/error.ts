import { serialize } from './utils';

export class NoRouteError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NoRouteError';
  }
}
export class RelayerError extends Error {
  params: any;
  description: string;

  constructor(message: string, params?: any) {
    super(message);
    this.name = 'RelayerError';
    this.params = params;
    this.description = 'an error occurred!';
  }

  toJson() {
    return {
      msg: this.description,
      error: this.message,
      params: serialize(this.params),
    };
  }
}

export class RelayError extends RelayerError {
  constructor(message: string, params?: any) {
    super(message, params);
    this.name = 'RelayError';
    this.description = 'failed to relay this request!';
  }
};

export class RouteError extends RelayerError {
  constructor(message: string, params?: any) {
    super(message, params);
    this.name = 'RouteError';
    this.description = 'failed to route this request!';
  }
};

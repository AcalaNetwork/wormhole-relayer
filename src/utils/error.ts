export class RelayerError extends Error {
  params: any;

  constructor(message: string, params?: any) {
    super(message);
    this.name = 'RelayerError';
    this.params = params;
  }
}

export class NoRouteError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NoRouteError';
  }
}

export class RelayError extends RelayerError {
  constructor(message: string, params?: any) {
    super(message, params);
    this.name = 'RelayError';
  }
};

export class RouteError extends RelayerError {
  constructor(message: string, params?: any) {
    super(message, params);
    this.name = 'RouteError';
  }
};

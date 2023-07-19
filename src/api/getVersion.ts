import { VERSION } from '../consts';

export const getVersion = (request: any, response: any): void => response.status(200).end(VERSION);

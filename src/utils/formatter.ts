import { Request } from 'express';

export const parseIp = (req: Request): string => {
  const rawIp = req.ip
    ?? req.headers['x-forwarded-for']
    ?? req.socket.remoteAddress
    ?? 'unknown';

  return rawIp.replace(/^::ffff:/, '');   // remove ipv6 prefix
};

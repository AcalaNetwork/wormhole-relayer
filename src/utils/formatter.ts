import { Request } from 'express';

export const parseIp = (req: Request): string => {
  const forwardedFor = req.headers['x-forwarded-for'];
  const forwardedIp = typeof forwardedFor === 'string'
    ? forwardedFor.split(',')[0]
    : Array.isArray(forwardedFor)
      ? forwardedFor[0]
      : undefined;

  const rawIp = forwardedIp
    ?? req.ip
    ?? req.socket.remoteAddress
    ?? 'unknown';

  return rawIp.replace(/^::ffff:/, '');   // remove ipv6 prefix
};

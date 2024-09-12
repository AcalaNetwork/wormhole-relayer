import { prisma } from './client';

export const connectDb = async () => {
  try {
    await prisma.$connect();
  } catch (err) {
    console.error('❗️ db connection failed!');
    throw err;
  }
};

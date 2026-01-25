import { createClient } from 'redis';

const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redisClient.on('error', (err: Error) => console.error('Redis Client Error', err));
redisClient.connect();

export const setItem = async (key: string, value: string, expiry?: number): Promise<void> => {
  if (expiry) {
    await redisClient.setEx(key, expiry, value);
  } else {
    await redisClient.set(key, value);
  }
};

export const getItem = async (key: string) => {
  return await redisClient.get(key);
};

export const deleteItem = async (key: string): Promise<void> => {
  await redisClient.del(key);
}; 
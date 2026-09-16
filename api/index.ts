import { app, initServerless } from '../server/app';

export default async function handler(req: any, res: any) {
  try {
    await initServerless();
  } catch (err) {
    console.error('Vercel serverless DB init error:', err);
  }
  return app(req, res);
}

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import * as trpcExpress from '@trpc/server/adapters/express';
import { appRouter } from './routers';
import { createContext } from './_core/context';
import { initDb } from './db';

let initialized = false;
let initPromise: Promise<void> | null = null;

export async function initServerless() {
  if (!initialized) {
    if (!initPromise) {
      initPromise = initDb()
        .then(() => {
          initialized = true;
        })
        .catch((err) => {
          initPromise = null;
          throw err;
        });
    }
    await initPromise;
  }
}

export function createApp() {
  const app = express();

  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
      crossOriginOpenerPolicy: false,
      crossOriginResourcePolicy: false,
      originAgentCluster: false,
      hsts: false,
    })
  );

  app.use(
    cors({
      origin: true,
      credentials: true,
    })
  );

  app.use(cookieParser());
  app.use(express.json());

  app.use(
    '/api/trpc',
    trpcExpress.createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'healthy', time: Date.now() });
  });

  return app;
}

export const app = createApp();

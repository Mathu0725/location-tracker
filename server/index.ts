import fs from 'fs';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import path from 'path';
import os from 'os';
import http from 'http';
import https from 'https';
import { fileURLToPath } from 'url';
import * as trpcExpress from '@trpc/server/adapters/express';
import { appRouter } from './routers';
import { createContext } from './_core/context';
import { initDb, cleanupRetentionData } from './db';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getLocalIp(): string {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return '127.0.0.1';
}

async function startServer() {
  await initDb();
  console.log('Database initialized successfully.');

  const app = express();
  const PORT = Number(process.env.PORT) || 3000;
  const HTTPS_PORT = Number(process.env.HTTPS_PORT) || 3443;
  const localIp = getLocalIp();

  // In local dev and LAN testing, disable HSTS, COOP, and CSP that break HTTP/Vite
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

  app.use(cors({
    origin: true,
    credentials: true,
  }));

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
    res.json({ status: 'healthy', time: Date.now(), ip: localIp });
  });

  setInterval(async () => {
    try {
      await cleanupRetentionData();
    } catch (e) {
      console.error('Periodic retention cleanup error:', e);
    }
  }, 60 * 60 * 1000).unref();

  const httpServer = http.createServer(app);

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: { server: httpServer },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const clientDist = path.resolve(__dirname, '../dist/client');
    app.use(express.static(clientDist));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(clientDist, 'index.html'));
    });
  }
  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`
======================================================`);
    console.log(`  ?? Location Consent Hub Running on All Interfaces:`);
    console.log(`  - Local Desktop:    http://localhost:${PORT}`);
    console.log(`  - LAN IP (HTTP):    http://${localIp}:${PORT}`);
    console.log(`  - Dialog Offers:    http://${localIp}:${PORT}/dialog-offers`);
    console.log(`  - Admin Dashboard:  http://${localIp}:${PORT}/admin`);
  });

  // 2. Start HTTPS Server on 0.0.0.0 (Required by iOS Safari & Android Chrome for GPS over IP)
  const certPath = path.resolve(__dirname, '../ssl/cert.pem');
  const keyPath = path.resolve(__dirname, '../ssl/key.pem');

  if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
    try {
      const httpsOptions = {
        key: fs.readFileSync(keyPath),
        cert: fs.readFileSync(certPath),
      };
      const httpsServer = https.createServer(httpsOptions, app);
      httpsServer.listen(HTTPS_PORT, '0.0.0.0', () => {
        console.log(`  - LAN IP (HTTPS):   https://${localIp}:${HTTPS_PORT} (Recommended for Mobile GPS)`);
        console.log(`  - Mobile Offers:    https://${localIp}:${HTTPS_PORT}/dialog-offers`);
        console.log(`======================================================
`);
      });
    } catch (err) {
      console.warn('Could not start HTTPS server:', err);
    }
  }
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});

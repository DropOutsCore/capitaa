import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import pinoHttp from 'pino-http';
import { pathToFileURL } from 'node:url';
import { randomUUID } from 'node:crypto';

import { config } from './config.js';
import { logger } from './logger.js';
import { snapshot, prometheus } from './metrics.js';
import { verify } from './auditLog.js';
import { documentsRouter } from './routes/documents.js';
import { logRouter } from './routes/log.js';
import { proofRouter } from './routes/proof.js';
import { attacksRouter } from './routes/attacks.js';
import { modelsRouter } from './routes/models.js';
import { benchRouter } from './routes/bench.js';
import { reportRouter } from './routes/report.js';

export function createApp() {
  const app = express();

  // Security headers + JSON body parsing with a hard ceiling.
  app.use(helmet());
  app.use(cors({ origin: config.corsOrigin }));
  app.use(express.json({ limit: '256kb' }));

  // Structured request logging with a per-request id.
  app.use(
    pinoHttp({
      logger,
      genReqId: (req) => req.headers['x-request-id'] || randomUUID(),
      autoLogging: { ignore: (req) => req.url === '/healthz' || req.url === '/metrics' },
    })
  );

  // Rate limiting on the whole API surface.
  const limiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'rate_limited', message: 'Too many requests, slow down.' },
  });
  app.use('/api', limiter);

  // Domain routes.
  app.use('/api/documents', documentsRouter);
  app.use('/api/log', logRouter);
  app.use('/api/proof', proofRouter);
  app.use('/api/attacks', attacksRouter);
  app.use('/api/models', modelsRouter);
  app.use('/api/bench', benchRouter);
  app.use('/api/report', reportRouter);

  // Liveness/readiness. Reports audit-chain integrity as part of health.
  app.get('/healthz', (req, res) => {
    const integrity = verify();
    res.json({
      status: integrity.intact ? 'ok' : 'degraded',
      auditChainIntact: integrity.intact,
      uptimeSeconds: snapshot().uptime_seconds,
    });
  });

  // Metrics. Default is Prometheus text; ?format=json returns the raw object
  // the frontend telemetry panel consumes.
  app.get('/metrics', (req, res) => {
    if (req.query.format === 'json') return res.json(snapshot());
    res.type('text/plain').send(prometheus());
  });

  app.use((req, res) => res.status(404).json({ error: 'not_found', path: req.path }));

  // Centralized error handler.
  app.use((err, req, res, _next) => {
    logger.error({ err }, 'unhandled error');
    res.status(500).json({ error: 'internal_error' });
  });

  return app;
}

// Only listen when run directly (keeps the app importable for the seed script/tests).
const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  const app = createApp();
  app.listen(config.port, () => {
    logger.info({ port: config.port }, `Capita API listening on :${config.port}`);
  });
}

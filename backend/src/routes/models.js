import { Router } from 'express';
import { status, simulateFailure, reset } from '../models.js';

export const modelsRouter = Router();

// GET /api/models/status — current routing + the always-on safety layer.
modelsRouter.get('/status', (req, res) => {
  res.json(status());
});

// POST /api/models/simulate-failure — knock down the active provider so
// routing fails over to the next tier. Safety controls stay enforced.
modelsRouter.post('/simulate-failure', (req, res) => {
  res.json(simulateFailure());
});

// POST /api/models/reset — restore primary online.
modelsRouter.post('/reset', (req, res) => {
  res.json(reset());
});

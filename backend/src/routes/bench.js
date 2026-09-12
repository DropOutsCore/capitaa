import { Router } from 'express';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

export const benchRouter = Router();

const __dirname = dirname(fileURLToPath(import.meta.url));
const RESULTS_PATH = join(__dirname, '..', '..', '..', 'bench', 'results.json');

// GET /api/bench — the latest measured harness results (or a hint to run it).
benchRouter.get('/', async (req, res) => {
  try {
    const raw = await readFile(RESULTS_PATH, 'utf8');
    res.type('application/json').send(raw);
  } catch {
    res.status(404).json({
      error: 'no_results',
      message: 'Run the benchmark first: `npm run bench` (from /backend).',
    });
  }
});

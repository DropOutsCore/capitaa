import { Router } from 'express';
import { z } from 'zod';
import { listAttacks, runAttack } from '../attacks.js';
import { appendEvent } from '../auditLog.js';
import { logger } from '../logger.js';

export const attacksRouter = Router();

// GET /api/attacks — the reproducible catalogue (metadata + payload preview).
attacksRouter.get('/', (req, res) => {
  const items = listAttacks();
  res.json({
    total: items.length,
    teamAuthored: items.filter((a) => a.author === 'team').length,
    categories: [...new Set(items.map((a) => a.category))],
    items,
  });
});

// POST /api/attacks/run — execute one attack through the real defenses.
const RunSchema = z.object({ id: z.string().min(1) });

attacksRouter.post('/run', async (req, res) => {
  const parsed = RunSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(422).json({ error: 'validation_error', issues: parsed.error.issues });
  }
  const result = await runAttack(parsed.data.id);
  if (!result) return res.status(404).json({ error: 'unknown_attack', id: parsed.data.id });
  // Record the attack simulation in the tamper-evident audit log.
  appendEvent({
    event: 'ATTACK_SIMULATED',
    actor: 'attack-lab',
    action: `${result.name} → ${result.result}`,
    payload: { id: result.id, category: result.category, decision: result.decision, result: result.result },
  });
  logger.info({ attack: result.id, result: result.result, decision: result.decision }, 'attack executed');
  res.json(result);
});

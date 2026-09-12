import { Router } from 'express';
import { z } from 'zod';
import { evaluate } from '../decisionEngine.js';
import { generateReport, LANGUAGES } from '../report.js';
import { appendEvent } from '../auditLog.js';
import { activeModelLabel } from '../models.js';
import { logger } from '../logger.js';

export const reportRouter = Router();

// GET /api/report/languages — the supported languages for the picker.
reportRouter.get('/languages', (req, res) => {
  res.json({ languages: LANGUAGES });
});

const ReportSchema = z.object({
  type: z.enum(['invoice', 'email', 'memo', 'document']).default('document'),
  text: z.string().min(1).max(20000),
  filename: z.string().max(200).optional(),
  requestedAmount: z.number().nonnegative().optional(),
  confirmed: z.boolean().optional().default(false),
  language: z.string().min(2).max(5).default('en'),
});

// POST /api/report — generate a multilingual security report for a document.
// The security DECISION is computed here by the deterministic engine; the LLM
// only translates the prose. The decision/status are identical across
// languages by construction.
reportRouter.post('/', async (req, res) => {
  const parsed = ReportSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(422).json({ error: 'validation_error', issues: parsed.error.issues });
  }
  const input = parsed.data;

  // 1) Deterministic decision (the source of truth for the report).
  const result = evaluate(input);

  // 2) Commit an audit event for the report generation.
  const audit = appendEvent({
    event: 'REPORT_GENERATED',
    actor: 'report-service',
    action: `Security report (${input.language}) · ${result.decision.toUpperCase()}`,
    payload: { decision: result.decision, language: input.language, file: input.filename || input.type },
  });

  // 3) Translate/format into the requested language (LLM or fallback).
  const report = await generateReport({ result, input, audit, languageCode: input.language });
  report.structured.proposer = activeModelLabel();

  logger.info({ decision: result.decision, language: input.language, engine: report.engine }, 'report generated');

  res.json({
    decision: result.decision,
    report,
    // echo the deterministic decision so the client can prove it's unchanged
    decisionSource: 'deterministic-engine',
  });
});

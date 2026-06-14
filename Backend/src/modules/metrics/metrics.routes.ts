import { Router } from 'express';
import { desc, eq } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { metrics } from '../../db/schema.js';
import { requireWorkspaceContext } from '../../middlewares/auth.middleware.js';

const router = Router({ mergeParams: true });

router.use(requireWorkspaceContext);

router.get('/', async (req, res, next) => {
  try {
    const rows = await db.select()
      .from(metrics)
      .where(eq(metrics.workspaceId, req.workspaceId!))
      .orderBy(desc(metrics.recordedAt));

    const latestByName = new Map<string, typeof metrics.$inferSelect>();
    for (const row of rows) {
      const key = `${row.provider}:${row.metricName}`;
      if (!latestByName.has(key)) {
        latestByName.set(key, row);
      }
    }

    res.json([...latestByName.values()].map((row) => ({
      id: row.id,
      provider: row.provider,
      metricName: row.metricName,
      value: row.value,
      recordedAt: row.recordedAt.toISOString(),
    })));
  } catch (error) {
    next(error);
  }
});

export default router;

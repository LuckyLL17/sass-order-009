import { Router } from 'express';
import { asyncHandler, validate } from '../middleware/validate.js';
import { optionalAuth } from '../middleware/auth.js';
import { idParamSchema, toolListQuerySchema } from '../validators/index.js';
import { toolService } from '../services/tool.service.js';
import { CATEGORIES, CATEGORY_LABELS } from '../enums.js';

const router = Router();

// GET /api/tools —— 工具查询与筛选（公开接口；登录后支持订阅状态过滤）
router.get(
  '/',
  optionalAuth,
  validate({ query: toolListQuerySchema }),
  asyncHandler(async (req, res) => {
    const q = req.validatedQuery as {
      category?: (typeof CATEGORIES)[number] | 'all';
      search?: string;
      sort?: Parameters<typeof toolService.list>[0]['sort'];
      priceMin?: number;
      priceMax?: number;
      ratingMin?: number;
      usersRange?: Parameters<typeof toolService.list>[0]['usersRange'];
      tags?: string[];
      subscriptionFilter?: Parameters<typeof toolService.list>[0]['subscriptionFilter'];
    };

    const tools = toolService.list(q ?? {}, req.user?.id);
    res.json({ success: true, data: tools });
  })
);

// GET /api/tools/meta —— 标签、分类计数等筛选项元数据
router.get(
  '/meta',
  asyncHandler(async (_req, res) => {
    const { total, categories } = toolService.categoryCounts();
    res.json({
      success: true,
      data: {
        total,
        tags: toolService.getAllTags(),
        categories: CATEGORIES.map((id) => ({
          id,
          name: CATEGORY_LABELS[id],
          count: categories[id] ?? 0,
        })),
      },
    });
  })
);

// GET /api/tools/:id
router.get(
  '/:id',
  validate({ params: idParamSchema }),
  asyncHandler(async (req, res) => {
    const tool = toolService.getById(req.params.id);
    res.json({ success: true, data: tool });
  })
);

export default router;

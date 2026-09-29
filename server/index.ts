import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MirrorService } from './service.js';

const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.env.PORT || 4317);
const app = express();
const service = new MirrorService(
  path.resolve(process.env.MIRROR_DATA_DIR || path.join(project, '.local')),
);
await service.init();
app.disable('x-powered-by');
app.use((req, res, next) => {
  // Local-only service; reject DNS rebinding and cross-origin requests before parsing a body.
  const host = req.headers.host || '';
  if (![`127.0.0.1:${port}`, `localhost:${port}`].includes(host)) {
    res.status(403).json({ error: '只允许本机访问' });
    return;
  }
  const origin = req.headers.origin;
  if (origin && ![`http://127.0.0.1:${port}`, `http://localhost:${port}`].includes(origin)) {
    res.status(403).json({ error: '不允许跨站请求本地文件服务' });
    return;
  }
  if (req.path.startsWith('/api')) res.setHeader('Cache-Control', 'no-store');
  next();
});
app.use(express.json({ limit: '256kb' }));
let queue = Promise.resolve();
function route(
  method: 'get' | 'post',
  endpoint: string,
  work: (req: express.Request) => Promise<unknown>,
) {
  app[method](endpoint, (req, res) => {
    const task = queue.then(() => work(req));
    queue = task.then(
      () => {},
      () => {},
    );
    task
      .then((result) => res.json(result))
      .catch((err) => {
        const message =
          err?.name === 'ZodError'
            ? '输入或模型输出不符合数据格式，请检查必填字段。'
            : err.message || '操作失败';
        res.status(400).json({ error: message });
      });
  });
}
route('get', '/api/state', () => service.state());
route('post', '/api/vault/preview', (req) => service.preview(req.body));
route('post', '/api/vault/connect', (req) => service.connect(req.body));
route('post', '/api/rebuild', () => service.rebuild());
route('post', '/api/checkins', (req) => service.checkin(req.body));
route('post', '/api/decisions', (req) => service.decide(req.body));
route('post', '/api/decisions/:id/action', (req) => service.act(String(req.params.id), req.body));
route('post', '/api/decisions/:id/reflection', (req) =>
  service.reflect(String(req.params.id), req.body),
);
route('post', '/api/settings/provider', (req) => service.settings(req.body));
route('get', '/api/evidence/:id', (req) => service.evidence(String(req.params.id)));
app.use('/api', (_req, res) => {
  res.status(404).json({ error: '接口不存在' });
});
if (process.argv.includes('--production')) {
  app.use(express.static(path.join(project, 'dist')));
  app.get('/{*path}', (_req, res) => res.sendFile(path.join(project, 'dist', 'index.html')));
} else {
  const { createServer } = await import('vite');
  const vite = await createServer({
    root: project,
    server: { middlewareMode: true },
    appType: 'spa',
  });
  app.use(vite.middlewares);
}
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  res.status(400).json({ error: err.message || '请求无效' });
});
const server = app.listen(port, '127.0.0.1', () =>
  console.log(
    `\n  三世镜 / Threefold Mirror\n  http://127.0.0.1:${port}\n  本地优先 · Markdown 是唯一长期记忆\n`,
  ),
);
server.on('error', (e) => {
  console.error('无法启动本地服务：', e.message);
  process.exitCode = 1;
});

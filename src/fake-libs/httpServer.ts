/**
 * ============================================================
 *  ⚠️ このファイルは【リファクタリング対象外】です。
 * ============================================================
 *
 * Express 風の見た目だけを真似た、最小の HTTP ルータです。
 * 実際にはポートを開かず、app.handle() を直接呼んでリクエストを再現します
 * （npm start がハングしないようにするため）。
 *
 * app.get / app.post / ミドルウェア / req.params / res.status().json()
 * といった「見慣れた形」が使えれば十分、という割り切りです。
 */

export interface Request {
  method: string;
  path: string;
  params: Record<string, string>;
  query: Record<string, string>;
  body: any;
  headers: Record<string, string>;
  /** 認証ミドルウェアが詰める。 */
  user?: any;
}

export interface Response {
  statusCode: number;
  body: any;
  status(code: number): Response;
  json(payload: any): Response;
  send(payload: any): Response;
  end(): Response;
}

export type Handler = (req: Request, res: Response, next: () => void) => any;

interface Route {
  method: string;
  segments: string[];
  handlers: Handler[];
}

export interface RequestOptions {
  body?: any;
  headers?: Record<string, string>;
  query?: Record<string, string>;
}

export class App {
  private routes: Route[] = [];

  get(path: string, ...handlers: Handler[]): void {
    this.register('GET', path, handlers);
  }

  post(path: string, ...handlers: Handler[]): void {
    this.register('POST', path, handlers);
  }

  put(path: string, ...handlers: Handler[]): void {
    this.register('PUT', path, handlers);
  }

  delete(path: string, ...handlers: Handler[]): void {
    this.register('DELETE', path, handlers);
  }

  listen(port: number): void {
    console.log(`[fake-http] listening on :${port}（実際にはポートを開きません）`);
  }

  async handle(method: string, path: string, options: RequestOptions = {}): Promise<Response> {
    const res = createResponse();
    const route = this.routes.find((r) => r.method === method && matches(r.segments, split(path)));

    if (!route) {
      return res.status(404).json({ message: 'Not Found' });
    }

    const req: Request = {
      method,
      path,
      params: extractParams(route.segments, split(path)),
      query: options.query ?? {},
      body: options.body,
      headers: options.headers ?? {},
    };

    for (const handler of route.handlers) {
      let advanced = false;
      await handler(req, res, () => {
        advanced = true;
      });
      // next() が呼ばれなければそこで終わり（レスポンス済み or 明示的な打ち切り）
      if (!advanced) break;
    }

    return res;
  }

  private register(method: string, path: string, handlers: Handler[]): void {
    this.routes.push({ method, segments: split(path), handlers });
  }
}

export function createApp(): App {
  return new App();
}

function createResponse(): Response {
  const res: Response = {
    statusCode: 200,
    body: undefined,
    status(code: number) {
      res.statusCode = code;
      return res;
    },
    json(payload: any) {
      res.body = payload;
      finished.add(res);
      return res;
    },
    send(payload: any) {
      res.body = payload;
      finished.add(res);
      return res;
    },
    end() {
      finished.add(res);
      return res;
    },
  };
  return res;
}

const finished = new WeakSet<Response>();

function isFinished(res: Response): boolean {
  return finished.has(res);
}

function split(path: string): string[] {
  return path.split('/').filter((s) => s.length > 0);
}

function matches(pattern: string[], actual: string[]): boolean {
  if (pattern.length !== actual.length) return false;
  return pattern.every((segment, i) => segment.startsWith(':') || segment === actual[i]);
}

function extractParams(pattern: string[], actual: string[]): Record<string, string> {
  const params: Record<string, string> = {};
  pattern.forEach((segment, i) => {
    if (segment.startsWith(':')) params[segment.slice(1)] = actual[i];
  });
  return params;
}

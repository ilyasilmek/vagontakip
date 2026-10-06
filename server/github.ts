import { decryptDatabase, encryptDatabase, fromBase64, toBase64, type EncryptedDatabase } from './crypto';
import { ApiError } from './errors';

export interface GitHubConfig {
  GITHUB_TOKEN?: string;
  GITHUB_REPOSITORY?: string;
  GITHUB_BRANCH?: string;
  GITHUB_DATABASE_PATH?: string;
  DB_ENCRYPTION_KEY?: string;
}

export class GitHubConflict extends Error {}

export class GitHubStore<T> {
  private readonly url: string;
  private readonly branch: string;
  constructor(private readonly env: GitHubConfig, private readonly fetcher: typeof fetch = fetch) {
    const repository = env.GITHUB_REPOSITORY ?? 'ilyasilmek/vagontakip';
    const path = env.GITHUB_DATABASE_PATH ?? 'data/database.enc.json';
    if (!/^[\w.-]+\/[\w.-]+$/.test(repository) || path.startsWith('/') || path.split('/').some(p => p === '..')) {
      throw new ApiError(503, 'CONFIGURATION_REQUIRED', 'GitHub veritabanı konumu yapılandırılmalı.');
    }
    this.url = `https://api.github.com/repos/${repository}/contents/${path.split('/').map(encodeURIComponent).join('/')}`;
    this.branch = env.GITHUB_BRANCH ?? 'main';
  }

  private headers(): HeadersInit {
    const missing = (['GITHUB_TOKEN', 'DB_ENCRYPTION_KEY'] as const).filter(name => !this.env[name]?.trim());
    if (missing.length) throw new ApiError(503, 'CONFIGURATION_REQUIRED', `Cloudflare Worker Secrets ayarlarında eksik veya boş: ${missing.join(', ')}. Değerleri çalışan Worker'ın Production ortamına ekleyip yayımlayın.`);
    return { Authorization: `Bearer ${this.env.GITHUB_TOKEN}`, Accept: 'application/vnd.github.object+json', 'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'VagonTakip-Worker', 'Content-Type': 'application/json' };
  }

  private async request(url: string, init: RequestInit): Promise<Response> {
    try { return await this.fetcher(url, { ...init, signal: AbortSignal.timeout(15_000) }); }
    catch { throw new ApiError(503, 'GITHUB_UNAVAILABLE', 'Ortak veritabanına ulaşılamadı. Daha sonra tekrar deneyin.'); }
  }

  async read(): Promise<{ database: T; sha: string } | null> {
    const response = await this.request(`${this.url}?ref=${encodeURIComponent(this.branch)}`, { headers: this.headers() });
    if (response.status === 404) return null;
    if (!response.ok) throw new ApiError(503, 'GITHUB_UNAVAILABLE', 'Ortak veritabanı okunamadı. GitHub erişimini kontrol edin.');
    const body = await response.json() as { content?: string; sha?: string; encoding?: string; size?: number };
    if (typeof body.sha !== 'string') throw new ApiError(503, 'INVALID_DATABASE', 'GitHub veritabanı dosyası geçersiz.');
    let json: string;
    if (body.encoding === 'base64' && typeof body.content === 'string') {
      json = new TextDecoder().decode(fromBase64(body.content));
    } else {
      // Contents API omits base64 above 1 MiB. Pin the raw read to the blob SHA,
      // not to a moving branch, to preserve optimistic concurrency guarantees.
      const raw = await this.request(`https://api.github.com/repos/${this.env.GITHUB_REPOSITORY ?? 'ilyasilmek/vagontakip'}/git/blobs/${body.sha}`, { headers: { ...this.headers(), Accept: 'application/vnd.github+json' } });
      if (!raw.ok) throw new ApiError(503, 'GITHUB_UNAVAILABLE', 'Ortak veritabanı okunamadı.');
      const blob = await raw.json() as { encoding: string; content: string };
      if (blob.encoding !== 'base64' || typeof blob.content !== 'string') throw new ApiError(503, 'INVALID_DATABASE', 'GitHub veritabanı dosyası geçersiz.');
      json = new TextDecoder().decode(fromBase64(blob.content));
    }
    let envelope: EncryptedDatabase;
    try { envelope = JSON.parse(json) as EncryptedDatabase; } catch { throw new ApiError(503, 'INVALID_DATABASE', 'GitHub veritabanı dosyası geçersiz.'); }
    return { database: await decryptDatabase<T>(envelope, this.env.DB_ENCRYPTION_KEY!), sha: body.sha };
  }

  async write(database: T, sha: string | null, message: string): Promise<string> {
    const headers = this.headers();
    const envelope = await encryptDatabase(database, this.env.DB_ENCRYPTION_KEY!);
    const content = toBase64(new TextEncoder().encode(JSON.stringify(envelope)));
    const response = await this.request(this.url, { method: 'PUT', headers, body: JSON.stringify({ message, content, branch: this.branch, ...(sha ? { sha } : {}) }) });
    if (response.status === 409 || response.status === 422) throw new GitHubConflict('GitHub database changed');
    if (!response.ok) throw new ApiError(503, 'GITHUB_WRITE_FAILED', 'Değişiklik ortak veritabanına kaydedilemedi. Lütfen tekrar deneyin.');
    const result = await response.json() as { content?: { sha?: string } };
    if (!result.content?.sha) throw new ApiError(503, 'GITHUB_WRITE_FAILED', 'GitHub kayıt sonucu doğrulanamadı.');
    return result.content.sha;
  }
}

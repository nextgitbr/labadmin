import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { logAppError } from '@/lib/logError';

export async function GET() {
  try {
    const pkgPath = path.join(process.cwd(), 'package.json');
    let version = '0.0.0';
    try {
      const raw = fs.readFileSync(pkgPath, 'utf-8');
      const pkg = JSON.parse(raw);
      version = pkg.version || version;
    } catch {}

    const commit = process.env.VERCEL_GIT_COMMIT_SHA || process.env.NEXT_PUBLIC_GIT_COMMIT || process.env.GIT_COMMIT || null;
    const builtAt = process.env.BUILD_TIME || process.env.NEXT_PUBLIC_BUILD_TIME || null;
    const nodeEnv = process.env.NODE_ENV || 'development';

    return NextResponse.json({ version, commit, builtAt, nodeEnv });
  } catch (error) {
    await logAppError('Failed to read build info', 'error', { message: (error as Error)?.message });
    return NextResponse.json({ error: 'Failed to read build info' }, { status: 500 });
  }
}

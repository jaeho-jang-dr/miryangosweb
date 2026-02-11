import { spawn } from 'child_process';
import path from 'path';

export interface NoterangRequest {
  title: string;
  language?: string;
  style?: 'modern' | 'minimal' | 'corporate' | 'creative';
  queries?: string[];
  sources?: string[];
  focus?: string;
  browser?: boolean;
}

export interface NoterangResult {
  success: boolean;
  notebookId?: string;
  pdfPath?: string;
  pptxPath?: string;
  slideCount?: number;
  error?: string;
}

const NOTERANG_SCRIPT = path.join(process.cwd(), 'apps', 'notebooklm-automation', 'run_noterang_api.py');
const NOTERANG_TIMEOUT = 5 * 60 * 1000; // 5 minutes

/**
 * Noterang (NotebookLM Automation) Python 프로세스 호출
 * run_noterang_api.py를 spawn하고 RESULT:{json} 출력을 파싱
 */
export async function runNoterang(request: NoterangRequest): Promise<NoterangResult> {
  const args = ['--title', request.title];

  if (request.language) {
    args.push('--language', request.language);
  }
  if (request.style) {
    args.push('--style', request.style);
  }
  if (request.queries && request.queries.length > 0) {
    args.push('--queries', request.queries.join(','));
  }
  if (request.sources && request.sources.length > 0) {
    args.push('--sources', request.sources.join(','));
  }
  if (request.focus) {
    args.push('--focus', request.focus);
  }
  if (request.browser) {
    args.push('--browser');
  }

  return new Promise((resolve, reject) => {
    const child = spawn('python', [NOTERANG_SCRIPT, ...args], {
      cwd: path.join(process.cwd(), 'apps', 'notebooklm-automation'),
      env: { ...process.env },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data: Buffer) => {
      stdout += data.toString('utf-8');
    });

    child.stderr.on('data', (data: Buffer) => {
      stderr += data.toString('utf-8');
    });

    const timer = setTimeout(() => {
      child.kill('SIGTERM');
      reject(new Error(`Noterang timeout (${NOTERANG_TIMEOUT / 1000}s)`));
    }, NOTERANG_TIMEOUT);

    child.on('close', (code) => {
      clearTimeout(timer);

      // RESULT:{json} 라인 파싱
      const resultMatch = stdout.match(/RESULT:(\{.*\})/);
      if (resultMatch) {
        try {
          const result: NoterangResult = JSON.parse(resultMatch[1]);
          resolve(result);
        } catch {
          reject(new Error(`Noterang JSON parse error: ${resultMatch[1]}`));
        }
      } else {
        reject(new Error(
          `Noterang failed (exit ${code}): ${stderr || stdout || 'no output'}`
        ));
      }
    });

    child.on('error', (err) => {
      clearTimeout(timer);
      reject(new Error(`Noterang spawn error: ${err.message}`));
    });
  });
}

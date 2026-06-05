import { spawn } from "node:child_process";

export interface RunResult {
  code: number;
  stdout: string;
  stderr: string;
}

/** Runs a command, optionally piping `input` to stdin. Never throws on non-zero exit. */
export function run(cmd: string, args: string[], opts: { input?: string; timeoutMs?: number; cwd?: string } = {}): Promise<RunResult> {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { cwd: opts.cwd });
    let stdout = "";
    let stderr = "";
    const timer = opts.timeoutMs
      ? setTimeout(() => { child.kill("SIGKILL"); }, opts.timeoutMs)
      : null;
    child.stdout.on("data", (d) => (stdout += d.toString()));
    child.stderr.on("data", (d) => (stderr += d.toString()));
    child.on("error", (e) => { if (timer) clearTimeout(timer); resolve({ code: -1, stdout, stderr: stderr + String(e) }); });
    child.on("close", (code) => { if (timer) clearTimeout(timer); resolve({ code: code ?? -1, stdout, stderr }); });
    if (opts.input != null) { child.stdin.write(opts.input); child.stdin.end(); }
  });
}

/** First command on PATH that exists, else null. `command -v` is a shell builtin,
 *  so it must run inside a shell — spawning "command" directly is ENOENT (it's not a
 *  binary), which previously made every lookup fail and silently disabled the reader. */
export async function which(...candidates: string[]): Promise<string | null> {
  for (const c of candidates) {
    const r =
      process.platform === "win32"
        ? await run("where", [c])
        : await run("sh", ["-c", `command -v ${c}`]);
    if (r.code === 0 && r.stdout.trim()) return c;
  }
  return null;
}

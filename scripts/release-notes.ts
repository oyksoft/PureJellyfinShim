#!/usr/bin/env bun
/**
 * Generate a GitHub release-notes file from CHANGELOG.md.
 *
 * Usage:
 *   bun scripts/release-notes.ts <ref-name>            # dry-run, prints to stdout
 *   bun scripts/release-notes.ts <ref-name> --write    # writes the file
 *
 * Reads CHANGELOG.md, extracts the section for the version embedded in
 * `<ref-name>` (e.g. `pure-v1.5.8` → CHANGELOG `[1.5.8]` section), and writes
 * `.github/release-notes/<ref-name>.md` with `## <ref-name>` as the first
 * line — matching what release.yml expects for `GITHUB_REF_NAME` validation.
 *
 * Heading mapping (Keep-a-Changelog → Chinese release headings):
 *   Fixed       → 修复
 *   Added       → 新增
 *   Changed     → 变更
 *   Deprecated  → 弃用
 *   Removed     → 移除
 *   Security    → 安全
 *   Maintenance → 清理
 *
 * If a CHANGELOG heading is already in Chinese, it passes through unchanged.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const REPO_ROOT = join(import.meta.dir, '..');
const CHANGELOG_PATH = join(REPO_ROOT, 'CHANGELOG.md');
const RELEASE_NOTES_DIR = join(REPO_ROOT, '.github', 'release-notes');

const VERSION_HEADING_RE = /^## \[(\d+\.\d+\.\d+(?:-[\w.]+)?)\] - (\d{4}-\d{2}-\d{2})/;
const SUBHEADING_RE = /^### ([\s\S]+?)$/;
const BULLET_RE = /^- ([\s\S]+?)$/;

const HEADING_MAP: Record<string, string> = {
  Fixed: '修复',
  Added: '新增',
  Changed: '变更',
  Deprecated: '弃用',
  Removed: '移除',
  Security: '安全',
  Maintenance: '清理',
};

interface ParsedSection {
  heading: string;
  bullets: string[];
}

interface ParsedChangelog {
  version: string;
  date: string;
  sections: ParsedSection[];
}

function parseChangelog(text: string, version: string): ParsedChangelog | null {
  // Normalize CRLF → LF so Windows-checked-out CHANGELOG.md still parses.
  // Also use [\s\S] (instead of `.`) in the regexes below since `.` does not
  // match line terminators in JavaScript.
  const lines = text.replaceAll('\r\n', '\n').split('\n');
  let start = -1;
  let date = '';
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(VERSION_HEADING_RE);
    if (m && m[1] === version) {
      start = i;
      date = m[2];
      break;
    }
  }
  if (start < 0) return null;

  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    if (lines[i].startsWith('## [')) {
      end = i;
      break;
    }
  }

  const sections: ParsedSection[] = [];
  let current: ParsedSection | null = null;
  for (let i = start + 1; i < end; i++) {
    const line = lines[i];
    const subMatch = SUBHEADING_RE.exec(line);
    if (subMatch) {
      const heading = HEADING_MAP[subMatch[1]] ?? subMatch[1];
      current = { heading, bullets: [] };
      sections.push(current);
      continue;
    }
    const bulletMatch = BULLET_RE.exec(line);
    if (bulletMatch && current) {
      // Strip any trailing whitespace from the captured bullet
      current.bullets.push(bulletMatch[1].trimEnd());
    }
  }

  return { version, date, sections };
}

function formatReleaseNotes(parsed: ParsedChangelog, refName: string): string {
  const lines: string[] = [`## ${refName}`, ''];
  for (const section of parsed.sections) {
    if (section.bullets.length === 0) continue;
    lines.push(`### ${section.heading}`, '');
    for (const bullet of section.bullets) {
      lines.push(`- ${bullet}`);
    }
    lines.push('');
  }
  // Trim trailing blank lines but keep exactly one trailing newline
  return lines.join('\n').replace(/\n+$/, '\n');
}

try {
  const args = process.argv.slice(2);
  const write = args.includes('--write');
  const refName = args.find((a) => !a.startsWith('--'));
  if (!refName || !/^[A-Za-z0-9._-]+-v\d+\.\d+\.\d+/.test(refName)) {
    console.error('Usage: bun scripts/release-notes.ts <ref-name> [--write]');
    console.error('Example: bun scripts/release-notes.ts pure-v1.5.8 --write');
    process.exit(1);
  }

  // Extract the bare version (e.g. `pure-v1.5.8` → `1.5.8`) for CHANGELOG lookup
  const version = refName.replace(/^[A-Za-z0-9._-]+-v/, '');
  if (!/^\d+\.\d+\.\d+/.test(version)) {
    console.error(`Error: cannot extract version from ref name '${refName}'`);
    process.exit(1);
  }

  const text = await readFile(CHANGELOG_PATH, 'utf8');
  const parsed = parseChangelog(text, version);
  if (!parsed) {
    console.error(`Error: version [${version}] not found in CHANGELOG.md`);
    process.exit(2);
  }
  if (parsed.sections.length === 0) {
    console.error(`Error: version [${version}] section is empty in CHANGELOG.md`);
    process.exit(3);
  }

  const output = formatReleaseNotes(parsed, refName);
  const outPath = join(RELEASE_NOTES_DIR, `${refName}.md`);

  if (!write) {
    console.log(`Dry run — would write ${outPath}:`);
    console.log('---');
    process.stdout.write(output);
    console.log('---');
    console.log(`(${parsed.sections.length} sections, ${output.length} bytes)`);
    console.log('Re-run with --write to save.');
  } else {
    await writeFile(outPath, output, 'utf8');
    console.log(`Wrote ${outPath} (${output.length} bytes, ${parsed.sections.length} sections)`);
  }
} catch (error) {
  console.error(error);
  process.exit(99);
}

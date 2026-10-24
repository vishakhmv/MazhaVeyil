// Node-only: loads rules.json once. The core modules never read files.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

export const ENGINE_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const loadRules = () => JSON.parse(readFileSync(join(ENGINE_ROOT, 'rules', 'rules.json'), 'utf8'));

import fs from 'node:fs/promises';
import { z } from 'zod';
import { recordSchema } from '../core/schema.js';
const schema = z.toJSONSchema(recordSchema);
await fs.mkdir('schemas', { recursive: true });
await fs.writeFile('schemas/record.schema.json', JSON.stringify(schema, null, 2) + '\n');
console.log('Exported schemas/record.schema.json; cross-record constraints live in core/protocol.ts.');

import fs from 'node:fs/promises';
import { z } from 'zod';
import { recordSchema, sourceGrantSchema } from '../core/schema.js';
const schema = z.toJSONSchema(recordSchema);
await fs.mkdir('schemas', { recursive: true });
await fs.writeFile('schemas/record.schema.json', JSON.stringify(schema, null, 2) + '\n');
await fs.writeFile('schemas/source-grant.schema.json', JSON.stringify(z.toJSONSchema(sourceGrantSchema), null, 2) + '\n');
console.log('Exported record and source-grant schemas; cross-record constraints live in core/protocol.ts.');

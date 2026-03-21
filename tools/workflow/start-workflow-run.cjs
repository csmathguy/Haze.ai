#!/usr/bin/env node
/**
 * Start a workflow engine run via the workflow API.
 * Usage: node tools/workflow/start-workflow-run.cjs <definitionName> <workItemId> "<summary>"
 *
 * This replaces the old `npm run workflow:start` for the new WorkflowEngine.
 */
const http = require('http');

const [,, definitionName = 'implementation', workItemId, summary = workItemId] = process.argv;

if (!workItemId) {
  console.error('Usage: start-workflow-run.cjs <definitionName> <workItemId> [summary]');
  process.exit(1);
}

const body = JSON.stringify({
  definitionName,
  input: { workItemId, summary }
});

const options = {
  hostname: 'localhost',
  port: 3181,
  path: '/api/workflow/runs',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body)
  }
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    try {
      const result = JSON.parse(data);
      if (res.statusCode === 201 && result.run) {
        console.log(`Workflow run started: ${result.run.id}`);
        console.log(`Status: ${result.run.status}`);
        process.exit(0);
      } else {
        console.error('Failed to start workflow run:', data);
        process.exit(1);
      }
    } catch {
      console.error('Failed to parse response:', data);
      process.exit(1);
    }
  });
});

req.on('error', (err) => {
  console.error('Could not connect to workflow API:', err.message);
  console.error('Is the workflow API running? Try: npm run dev:workflow:api');
  process.exit(1);
});

req.write(body);
req.end();

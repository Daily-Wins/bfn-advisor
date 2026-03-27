/**
 * Analyze collected feedback and suggest improvements.
 * npx tsx scripts/analyze-feedback.ts
 */

import { createClient } from '@libsql/client';

const db = createClient({
  url: 'libsql://bfn-advisor-bratland.aws-eu-west-1.turso.io',
  authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3NzQ1NzE4ODYsImlkIjoiMDE5ZDJjYjktZTgwMS03YjZjLThmMDUtNjM1ZWRjZjI1ZTkzIiwicmlkIjoiYzgzMmI0MTEtZTUyNS00Njg3LWIwNTEtOWUxMGE2MWNiNzljIn0.1U_OrZY6wGpnQy4EmtGIfHClNqeqDgzItoQXqqF4XWm15VRNhXVlLHCLGfjeTdVv_uQUUaaH_qn2dyN9a47XAg',
});

async function main() {
  // Stats
  const stats = await db.execute('SELECT COUNT(*) as total, SUM(CASE WHEN vote=\'up\' THEN 1 ELSE 0 END) as up, SUM(CASE WHEN vote=\'down\' THEN 1 ELSE 0 END) as down FROM feedback');
  const row = stats.rows[0];
  const total = Number(row.total);
  const up = Number(row.up);
  const down = Number(row.down);
  const satisfaction = total > 0 ? Math.round(up / total * 100) : 0;

  console.log('╔══════════════════════════════════════╗');
  console.log('║     K2K3.ai Feedback Analysis        ║');
  console.log('╚══════════════════════════════════════╝');
  console.log('');
  console.log('Total:         ' + total);
  console.log('Thumbs up:     ' + up);
  console.log('Thumbs down:   ' + down);
  console.log('Satisfaction:  ' + satisfaction + '%');
  console.log('');

  // Negative feedback details
  const negatives = await db.execute('SELECT question, feedback_text, sources, substr(answer, 1, 300) as answer_preview, created_at FROM feedback WHERE vote=\'down\' ORDER BY created_at DESC');

  if (negatives.rows.length > 0) {
    console.log('══ Negative Feedback ══');
    for (const row of negatives.rows) {
      console.log('');
      console.log('  Question: ' + row.question);
      console.log('  Feedback: ' + (row.feedback_text || '(ingen text)'));
      console.log('  Sources:  ' + row.sources);
      console.log('  Date:     ' + row.created_at);
      console.log('  Answer:   ' + String(row.answer_preview).slice(0, 150).replace(/\n/g, ' '));

      // Analyze routing
      const sources = JSON.parse(String(row.sources || '[]'));
      const question = String(row.question).toLowerCase();
      console.log('');
      console.log('  → Routing analysis:');
      if (question.includes('leasing') && !sources.some((s: string) => s.includes('Kap 7') || s.includes('leasing'))) {
        console.log('    ROUTING MISS: "leasing" i frågan men K2 Kap 7 saknas i sources');
      }
      if (question.includes('avskrivning') && !sources.some((s: string) => s.includes('Kap 10'))) {
        console.log('    ROUTING MISS: "avskrivning" i frågan men K2 Kap 10 saknas');
      }
      console.log('    Loaded: ' + sources.join(', '));
    }
    console.log('');
  }

  // Suggest test cases from negative feedback
  if (negatives.rows.length > 0) {
    console.log('══ Suggested New Test Cases ══');
    for (const row of negatives.rows) {
      const q = String(row.question);
      if (q.length > 10) {
        console.log('');
        console.log('  {');
        console.log('    id: NEW,');
        console.log('    name: \'' + q.slice(0, 50) + '\',');
        console.log('    question: \'' + q.replace(/'/g, "\\'") + '\',');
        console.log('    mustContain: [/* TODO: fill based on expected answer */],');
        console.log('  },');
      }
    }
  }
}

main().catch(console.error);

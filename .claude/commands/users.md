---
description: Lista registrerade användare och statistik från K2K3.ai
---

Kör följande kommando för att hämta användare från Turso-databasen:

```bash
cd app && npx tsx -e "
const { createClient } = require('@libsql/client');
const db = createClient({
  url: process.env.TURSO_DATABASE_URL || 'libsql://bfn-advisor-bratland.aws-eu-west-1.turso.io',
  authToken: process.env.TURSO_AUTH_TOKEN,
});
async function main() {
  const users = await db.execute('SELECT email, created_at FROM users ORDER BY created_at DESC');
  const stats = await db.execute('SELECT user_id, COUNT(*) as questions FROM user_statistics GROUP BY user_id');
  const anon = await db.execute('SELECT COUNT(*) as total, SUM(question_count) as questions FROM anonymous_sessions WHERE question_count > 0');

  console.log('=== Registrerade användare ===');
  if (users.rows.length === 0) {
    console.log('Inga ännu.');
  } else {
    const statsMap = Object.fromEntries(stats.rows.map(r => [r.user_id, r.questions]));
    for (const u of users.rows) {
      const q = statsMap[u.id] || 0;
      console.log('  ' + u.email + '  (' + u.created_at?.toString().slice(0,10) + ', ' + q + ' frågor)');
    }
  }
  console.log('Totalt: ' + users.rows.length + ' användare');
  console.log('');
  console.log('=== Anonyma besökare ===');
  console.log('Unika sessioner: ' + anon.rows[0]?.total);
  console.log('Totala frågor: ' + anon.rows[0]?.questions);
}
main().catch(console.error);
"
```

Presentera resultatet som en tydlig tabell. Om argument $ARGUMENTS innehåller "email" eller "e-post", visa bara e-postadresserna utan statistik.

// Loads the Oracle CO sample schema.
//
// `co_install.sql` is not used: it drives the load through `ACCEPT ... PROMPT`,
// which cannot run unattended. The two scripts it would call take no
// substitution variables of their own, so they are run directly as the CO user
// the container already created.
import { execFileSync } from 'node:child_process';

const COMPOSE = ['compose', '-f', 'docker/oracle.compose.yml'];
const SQLPLUS = 'co/co@localhost:1521/FREEPDB1';

function sqlplus(script) {
  const started = Date.now();

  const output = execFileSync(
    'docker',
    [...COMPOSE, 'exec', '-T', 'oracle', 'sqlplus', '-s', SQLPLUS, `@/co/${script}`],
    { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
  );

  const seconds = ((Date.now() - started) / 1000).toFixed(1);
  const errors = output.split('\n').filter((line) => /^(ORA|SP2)-/.test(line.trim()));

  console.log(`${script} took ${seconds}s`);

  // sqlplus reports failures in its output and still exits 0, so the output is
  // what has to be read. A seed that half worked is worse than one that did not.
  if (errors.length > 0) {
    console.error(errors.slice(0, 10).join('\n'));
    throw new Error(`${script} reported ${errors.length} Oracle error(s)`);
  }
}

sqlplus('co_create.sql');
sqlplus('co_populate.sql');
console.log('CO schema loaded');

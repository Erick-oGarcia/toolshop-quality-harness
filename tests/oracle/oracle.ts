import oracledb, { type Connection } from 'oracledb';

/**
 * Reads against the Oracle sample schema, in **thin mode**.
 *
 * `oracledb.initOracleClient()` is deliberately never called. That switches the
 * driver to thick mode, which needs Oracle Instant Client installed on every
 * machine that runs the suite — the historical reason Oracle checks end up
 * running on one developer's laptop and nowhere else. Since node-oracledb 6 the
 * thin driver speaks the protocol directly, so the CI job needs nothing beyond
 * `npm ci`.
 */
const DEFAULT_CONNECTION = {
  user: process.env.ORACLE_USER ?? 'co',
  password: process.env.ORACLE_PASSWORD ?? 'co',
  connectString: process.env.ORACLE_CONNECT_STRING ?? 'localhost:1521/FREEPDB1',
};

export type OracleParam = string | number | Date | null;

export class OracleDatabase {
  constructor(private readonly connection: Connection) {}

  async rows<T>(sql: string, params: OracleParam[] = []): Promise<T[]> {
    const result = await this.connection.execute<T>(sql, params, {
      outFormat: oracledb.OUT_FORMAT_OBJECT,
    });

    return result.rows ?? [];
  }

  async value<T>(sql: string, params: OracleParam[] = []): Promise<T | undefined> {
    const [first] = await this.rows<Record<string, T>>(sql, params);
    return first === undefined ? undefined : Object.values(first)[0];
  }
}

export async function openOracle(): Promise<{
  oracle: OracleDatabase;
  close: () => Promise<void>;
}> {
  const connection = await oracledb.getConnection(DEFAULT_CONNECTION);

  return {
    oracle: new OracleDatabase(connection),
    close: () => connection.close(),
  };
}

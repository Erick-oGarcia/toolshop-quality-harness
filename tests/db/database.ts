import mysql, { type Connection } from 'mysql2/promise';

/**
 * The database the application writes to, reached directly rather than through
 * the API. That is the whole point: a test that asks the application whether the
 * application is right can only ever agree with it.
 */
const DEFAULT_URL = 'mysql://root:root@127.0.0.1:3306/toolshop';

/**
 * What MySQL accepts as a bound parameter. `unknown[]` does not compile here,
 * and that rejection is the compiler catching a real mistake rather than
 * leaving it for the first query that runs.
 */
export type QueryParam = string | number | boolean | Date | null;

export class Database {
  constructor(private readonly connection: Connection) {}

  /** Parameterised read. Everything here is a read — tests never write. */
  async rows<T>(sql: string, params: QueryParam[] = []): Promise<T[]> {
    const [result] = await this.connection.execute(sql, params);
    return result as T[];
  }

  async value<T>(sql: string, params: QueryParam[] = []): Promise<T | undefined> {
    const [first] = await this.rows<Record<string, T>>(sql, params);
    return first === undefined ? undefined : Object.values(first)[0];
  }
}

export async function openDatabase(): Promise<{
  db: Database;
  close: () => Promise<void>;
}> {
  const connection = await mysql.createConnection(process.env.DATABASE_URL ?? DEFAULT_URL);

  return {
    db: new Database(connection),
    close: () => connection.end(),
  };
}

/**
 * Narrows an optional row and fails with a message that names the missing thing.
 *
 * `expect(row).toBeDefined()` does not narrow: an assertion library runs at run
 * time and the compiler cannot learn from it. The `asserts` signature is how the
 * check is expressed in a way TypeScript understands, so the lines that follow
 * can use the row without a non-null assertion hiding the question.
 */
export function mustExist<T>(row: T | undefined, message: string): asserts row is T {
  if (row === undefined) {
    throw new Error(message);
  }
}

import type { Pool, QueryResultRow } from 'pg'
import { EventJournalSchemaIncompatible } from '../errors/event-journal'

export const EVENT_JOURNAL_SCHEMA = 'ships_n_cargo'
export const EVENT_JOURNAL_TABLE = 'event_journal'
export const EVENT_JOURNAL_CONSTRAINTS = {
  positiveVersion: 'event_journal_version_positive',
  streamPosition: 'event_journal_stream_position_pkey'
} as const

interface ColumnRow extends QueryResultRow {
  column_name: string
  data_type: string
  is_nullable: 'YES' | 'NO'
  is_identity: 'YES' | 'NO'
  identity_generation: 'ALWAYS' | null
}

interface ConstraintRow extends QueryResultRow {
  constraint_definition: string
  constraint_name: string
  constraint_type: 'PRIMARY KEY' | 'UNIQUE' | 'CHECK'
  columns: string[]
}

const expectedColumns: readonly ColumnRow[] = [
  {
    column_name: 'aggregate_id',
    data_type: 'text',
    is_nullable: 'NO',
    is_identity: 'NO',
    identity_generation: null
  },
  {
    column_name: 'version',
    data_type: 'bigint',
    is_nullable: 'NO',
    is_identity: 'NO',
    identity_generation: null
  },
  {
    column_name: 'event_payload',
    data_type: 'text',
    is_nullable: 'NO',
    is_identity: 'NO',
    identity_generation: null
  }
]

const columnsSql = `
  SELECT column_name, data_type, is_nullable, is_identity, identity_generation
  FROM information_schema.columns
  WHERE table_schema = $1 AND table_name = $2
  ORDER BY ordinal_position
`

const constraintsSql = `
  SELECT
    journal_constraint.conname AS constraint_name,
    CASE journal_constraint.contype
      WHEN 'p' THEN 'PRIMARY KEY'
      WHEN 'u' THEN 'UNIQUE'
      WHEN 'c' THEN 'CHECK'
    END AS constraint_type,
    ARRAY(
      SELECT attribute.attname::text
      FROM unnest(journal_constraint.conkey) WITH ORDINALITY AS key(attnum, ordinal_position)
      JOIN pg_catalog.pg_attribute AS attribute
        ON attribute.attrelid = journal_constraint.conrelid
        AND attribute.attnum = key.attnum
      ORDER BY key.ordinal_position
    ) AS columns,
    pg_catalog.pg_get_constraintdef(journal_constraint.oid, false) AS constraint_definition
  FROM pg_catalog.pg_constraint AS journal_constraint
  JOIN pg_catalog.pg_class AS journal_table
    ON journal_table.oid = journal_constraint.conrelid
  JOIN pg_catalog.pg_namespace AS journal_schema
    ON journal_schema.oid = journal_table.relnamespace
  WHERE journal_schema.nspname = $1 AND journal_table.relname = $2
`

const sameColumns = (actual: readonly ColumnRow[]): boolean =>
  JSON.stringify(actual) === JSON.stringify(expectedColumns)

const hasConstraint = (
  constraints: readonly ConstraintRow[],
  name: string,
  type: ConstraintRow['constraint_type'],
  columns: readonly string[]
): boolean =>
  constraints.some(
    (constraint) =>
      constraint.constraint_name === name &&
      constraint.constraint_type === type &&
      JSON.stringify(constraint.columns) === JSON.stringify(columns)
  )

const hasCheckConstraint = (
  constraints: readonly ConstraintRow[],
  name: string,
  definition: string
): boolean =>
  constraints.some(
    (constraint) =>
      constraint.constraint_name === name &&
      constraint.constraint_type === 'CHECK' &&
      constraint.constraint_definition === definition
  )

export const verifyEventJournalSchema = async (pool: Pool): Promise<void> => {
  const values = [EVENT_JOURNAL_SCHEMA, EVENT_JOURNAL_TABLE]
  const [columnsResult, constraintsResult] = await Promise.all([
    pool.query<ColumnRow>(columnsSql, values),
    pool.query<ConstraintRow>(constraintsSql, values)
  ])

  if (!sameColumns(columnsResult.rows)) {
    throw new EventJournalSchemaIncompatible(
      `expected columns ${JSON.stringify(expectedColumns)}, received ${JSON.stringify(columnsResult.rows)}`
    )
  }

  if (
    !hasConstraint(
      constraintsResult.rows,
      EVENT_JOURNAL_CONSTRAINTS.streamPosition,
      'PRIMARY KEY',
      ['aggregate_id', 'version']
    )
  ) {
    throw new EventJournalSchemaIncompatible(
      `required stream-position primary key '${EVENT_JOURNAL_CONSTRAINTS.streamPosition} (aggregate_id, version)' is missing`
    )
  }

  if (
    !hasCheckConstraint(
      constraintsResult.rows,
      EVENT_JOURNAL_CONSTRAINTS.positiveVersion,
      'CHECK ((version > 0))'
    )
  ) {
    throw new EventJournalSchemaIncompatible(
      `required check constraint '${EVENT_JOURNAL_CONSTRAINTS.positiveVersion} CHECK ((version > 0))' is missing or incompatible`
    )
  }
}

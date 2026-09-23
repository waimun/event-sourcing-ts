import { InfrastructureError } from '../../shared/error'

export class PostgreSqlConnectionStringInvalid extends InfrastructureError {
  constructor() {
    super({
      code: 'POSTGRESQL_CONNECTION_STRING_INVALID',
      message: 'SHIPS_N_CARGO_DATABASE_URL must contain a PostgreSQL connection string'
    })
  }
}

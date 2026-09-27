/** Typed storage/domain errors. API handlers map them to HTTP status codes. */
export class StorageError extends Error {
  constructor(message: string, readonly code: string) {
    super(message)
    this.name = new.target.name
  }
}

export class NotFoundError extends StorageError {
  constructor(what: string) {
    super(`${what} not found`, 'not_found')
  }
}

export class ConflictError extends StorageError {
  constructor(path: string) {
    super(`${path} was changed on disk since it was loaded`, 'conflict')
  }
}

export class InvalidPathError extends StorageError {
  constructor(path: string) {
    super(`Invalid path: ${path}`, 'invalid_path')
  }
}

export class EntryParseError extends StorageError {
  constructor(path: string, reason: string) {
    super(`Cannot parse ${path}: ${reason}`, 'invalid_entry')
  }
}

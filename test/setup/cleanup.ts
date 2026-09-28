import { afterAll } from 'vitest'
import { removeTestWorkspaces } from '../utils/workspace'

// Registered before the test file's own hooks, so it runs last: after its books and servers are closed.
afterAll(removeTestWorkspaces)

import type { InjectionKey } from 'vue'
import type { ResolvedProvenance } from '#shared/schemas/provenance'

/** Provided by the write page: AI-assisted passages of the open entry, highlighted when the author wants. */
export interface ProvenanceContext {
  /** Ranges to highlight (empty while highlighting is off). */
  shown: Ref<ResolvedProvenance[]>
}

export const PROVENANCE_CONTEXT: InjectionKey<ProvenanceContext> = Symbol('provenance')

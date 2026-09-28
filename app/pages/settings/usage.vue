<script setup lang="ts">
const usage = useUsage()
const { report, isPending, error, sections, budget, budgetShare } = usage
const monthItems = [{ label: 'This month', value: 1 }, { label: 'Last 3 months', value: 3 }, { label: 'Last 6 months', value: 6 }, { label: 'Last 12 months', value: 12 }]
useSeoMeta({ title: 'Usage' })
</script>

<template>
  <div class="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4 sm:p-6">
    <BasePageHeader
      title="Usage"
      description="Tokens and estimated cost of every AI call, across all books. Prices are list-price estimates – your provider's bill is authoritative."
    />
    <USelect
      v-model="usage.months.value"
      :items="monthItems"
      aria-label="Period"
      class="w-full sm:w-48"
    />
    <UAlert
      v-if="error"
      color="error"
      variant="subtle"
      title="Could not load usage"
      :description="apiErrorMessage(error)"
    />
    <p
      v-else-if="isPending"
      class="text-sm text-muted"
    >
      Loading…
    </p>
    <template v-else-if="report && budget">
      <UsageTotals :totals="report.totals" />
      <UsageBudgetForm
        :status="budget"
        :share="budgetShare"
        @save="usage.setBudget"
      />
      <div class="grid gap-4 md:grid-cols-2">
        <UsageBreakdown
          v-for="section in sections"
          :key="section.id"
          :title="section.title"
          :groups="section.groups"
        />
      </div>
    </template>
  </div>
</template>

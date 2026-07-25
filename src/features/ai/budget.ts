export type BudgetStatus = { level: 'none' | 'warning' | 'exceeded'; percent: number }

export function getBudgetStatus(estimatedCost: number, monthlyBudget: number): BudgetStatus {
  if (monthlyBudget <= 0) return { level: 'none', percent: 0 }
  const percent = (estimatedCost / monthlyBudget) * 100
  return { level: percent >= 100 ? 'exceeded' : percent >= 80 ? 'warning' : 'none', percent }
}

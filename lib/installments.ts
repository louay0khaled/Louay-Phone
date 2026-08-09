export type InstallmentPlan = {
  months: number;
  first_payment_type: 'fixed' | 'percentage';
  first_payment_value: number;
  total_price?: number | null;
  monthly_amount?: number | null;
};

export function calculateInstallment(price: number, plan: InstallmentPlan) {
  const firstPayment = plan.first_payment_type === 'percentage'
    ? price * (plan.first_payment_value / 100)
    : plan.first_payment_value;

  const total = plan.total_price ?? price;
  const monthly = plan.monthly_amount ?? Math.max(0, (total - firstPayment) / plan.months);

  return { firstPayment, monthly, total, months: plan.months };
}

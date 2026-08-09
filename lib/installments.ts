export type InstallmentPlan = {
  months: number;
  first_payment_type: 'fixed' | 'percentage';
  first_payment_value: number;
  total_price?: number | null;
  monthly_amount?: number | null;
};

/**
 * Calculates a transparent installment plan.
 * Throws for invalid financial configuration instead of silently producing
 * zero/NaN/negative values.
 */
export function calculateInstallment(price: number, plan: InstallmentPlan) {
  if (!Number.isFinite(price) || price <= 0) {
    throw new Error('سعر المنتج غير صالح.');
  }

  if (!Number.isInteger(plan.months) || plan.months <= 0) {
    throw new Error('عدد أشهر التقسيط يجب أن يكون رقمًا صحيحًا أكبر من صفر.');
  }

  if (!Number.isFinite(plan.first_payment_value) || plan.first_payment_value < 0) {
    throw new Error('قيمة الدفعة الأولى غير صالحة.');
  }

  if (plan.first_payment_type === 'percentage' && plan.first_payment_value > 100) {
    throw new Error('نسبة الدفعة الأولى لا يمكن أن تتجاوز 100٪.');
  }

  const total = plan.total_price ?? price;
  if (!Number.isFinite(total) || total <= 0) {
    throw new Error('إجمالي سعر التقسيط غير صالح.');
  }

  const firstPayment = plan.first_payment_type === 'percentage'
    ? total * (plan.first_payment_value / 100)
    : plan.first_payment_value;

  if (!Number.isFinite(firstPayment) || firstPayment < 0 || firstPayment > total) {
    throw new Error('الدفعة الأولى يجب أن تكون بين صفر وإجمالي سعر التقسيط.');
  }

  const configuredMonthly = plan.monthly_amount;
  const monthly = configuredMonthly == null
    ? (total - firstPayment) / plan.months
    : configuredMonthly;

  if (!Number.isFinite(monthly) || monthly < 0) {
    throw new Error('قيمة القسط الشهري غير صالحة.');
  }

  return { firstPayment, monthly, total, months: plan.months };
}

/**
 * URSSAF CESU Reverse-Engineered Laws (Exonération 70)
 * Highly accurate calculations for French URSSAF CESU household employment
 * under the Prestation de compensation du handicap (PCH) or Allocation
 * personnalisée d'autonomie (APA) exemption.
 */

// Safe floating point rounding to 2 decimals
export const round = (val) => Math.round((val + Number.EPSILON) * 100) / 100;

/**
 * Forward Law: Computes full payroll details, including Gross Wage (brut),
 * employee contributions, employer contributions, and net out-of-pocket cost.
 * 
 * @param {number} salHr - Hourly net salary (legal minimum is 10.82 €).
 * @param {number} nbHr - Hours worked in the month.
 * @returns {object} Highly granular payroll and contribution breakdown.
 */
export function calculateForward(salHr, nbHr, creditDimpot = true) {
  // Clamp to legal minimum
  const effectiveSalHr = Math.max(salHr, 10.82);
  const pmss = 4005.00;
  const salNet = round(effectiveSalHr * nbHr);
  
  // 1. Determine Gross G
  let G;
  if (effectiveSalHr === 10.82) {
    G = round(13.87 * nbHr);
  } else if (salNet <= 3128.70) {
    G = round(salNet / 0.7811975);
  } else {
    // Bracket 2 (Gross exceeds PMSS)
    G = round((salNet + 89.3105) / 0.8020975);
  }
  
  // CSG Basis
  const csg_basis = round(G * 0.9825);
  
  // 2. Employee Contributions
  const csg_non_ded_basis_1 = round(csg_basis * 0.024);
  const csg_non_ded_basis_2 = round(csg_basis * 0.005);
  const csg_non_ded = round(csg_non_ded_basis_1 + csg_non_ded_basis_2);
  const csg_ded = round(csg_basis * 0.068);
  
  // Vieillesse split
  const g_capped = Math.min(G, pmss);
  const vieillesse_capped = round(g_capped * 0.069);
  const vieillesse_uncapped = round(G * 0.004);
  const vieillesse_sal = round(vieillesse_capped + vieillesse_uncapped);
  
  // Retraite Complémentaire Employee split
  let retraite_sal_standard = 0;
  let retraite_sal_ceg = 0;
  let retraite_sal_cet = 0;
  let retraite_sal = 0;
  
  if (G <= pmss) {
    retraite_sal_standard = round(G * 0.0315);
    retraite_sal_ceg = round(G * 0.0086);
    retraite_sal = round(retraite_sal_standard + retraite_sal_ceg);
  } else {
    const r_t1_std = round(pmss * 0.0315);
    const r_t1_ceg = round(pmss * 0.0086);
    const r_t1_cet = round(pmss * 0.0014);
    const r_t1 = round(r_t1_std + r_t1_ceg + r_t1_cet);
    retraite_sal = round(r_t1 + (round(G * 0.0986) - round(pmss * 0.0986)));
    retraite_sal_standard = r_t1_std;
    retraite_sal_ceg = r_t1_ceg;
    retraite_sal_cet = round(r_t1_cet + (round(G * 0.0986) - round(pmss * 0.0986)));
  }
  
  // IRCEM Prévoyance Employee
  let prevoyance_sal = 0;
  if (G <= pmss) {
    prevoyance_sal = round(G * 0.0104);
  } else {
    prevoyance_sal = round(pmss * 0.0104);
  }
  
  // Sum of employee contributions
  const C_sal = round(csg_non_ded + csg_ded + vieillesse_sal + retraite_sal + prevoyance_sal);
  
  // 3. Employer Contributions paid
  const accident = round(G * 0.0206);
  const fnal = round(Math.min(G, pmss) * 0.001);
  const cfp = round(G * 0.0085);
  const csa = round(G * 0.003);
  const dialogue = round(G * 0.00016);
  const sante = Math.min(round(G * 0.027), 5.00);
  
  // Retraite Complémentaire Employer split
  let retraite_emp = 0;
  let retraite_emp_std = 0;
  let retraite_emp_ceg = 0;
  let retraite_emp_cet = 0;
  
  if (G <= pmss) {
    retraite_emp_std = round(G * 0.0472);
    retraite_emp_ceg = round(G * 0.0129);
    retraite_emp = round(retraite_emp_std + retraite_emp_ceg);
  } else {
    const r_emp_t1_std = round(pmss * 0.0472);
    const r_emp_t1_ceg = round(pmss * 0.0129);
    const r_emp_t1_cet = round(pmss * 0.0021);
    const r_emp_t1 = round(r_emp_t1_std + r_emp_t1_ceg + r_emp_t1_cet);
    retraite_emp = round(r_emp_t1 + (round(G * 0.1478) - round(pmss * 0.1478)));
    retraite_emp_std = r_emp_t1_std;
    retraite_emp_ceg = r_emp_t1_ceg;
    retraite_emp_cet = round(r_emp_t1_cet + (round(G * 0.1478) - round(pmss * 0.1478)));
  }
  
  // IRCEM Employer
  let prevoyance_emp = 0;
  let prevoyance_emp_t1_std = 0;
  let prevoyance_emp_t1_add = 0;
  let prevoyance_emp_t2_add = 0;
  
  if (G <= pmss) {
    prevoyance_emp = round(G * 0.0245);
    prevoyance_emp_t1_std = round(G * 0.012);
    prevoyance_emp_t1_add = round(G * 0.0125);
  } else {
    const g_above = round(G - pmss);
    prevoyance_emp_t1_std = round(pmss * 0.012);
    prevoyance_emp_t1_add = round(pmss * 0.0125);
    prevoyance_emp_t2_add = round(g_above * 0.0125);
    prevoyance_emp = round(prevoyance_emp_t1_std + prevoyance_emp_t1_add + prevoyance_emp_t2_add);
  }
  
  // Chômage Employer split
  let chomage = 0;
  let chomage_t1 = 0;
  let chomage_t2 = 0;
  
  if (G <= pmss) {
    chomage = round(G * 0.04);
    chomage_t1 = chomage;
  } else {
    const g_above = round(G - pmss);
    chomage_t1 = round(pmss * 0.04);
    chomage_t2 = round(g_above * 0.04);
    chomage = round(chomage_t1 + chomage_t2);
  }
  
  const C_emp = round(accident + fnal + cfp + csa + dialogue + sante + retraite_emp + prevoyance_emp + chomage);
  
  const total_cost = round(salNet + C_sal + C_emp);
  const tax_credit = creditDimpot ? round(total_cost * 0.5) : 0;
  const net_cost = round(total_cost - tax_credit);
  
  return {
    inputs: {
      salHr: effectiveSalHr,
      nbHr
    },
    salNet,
    gross: G,
    csgBasis: csg_basis,
    employee: {
      csgNonDed: csg_non_ded,
      csgNonDedDetails: {
        csg: csg_non_ded_basis_1,
        crds: csg_non_ded_basis_2
      },
      csgDed: csg_ded,
      vieillesse: vieillesse_sal,
      vieillesseDetails: {
        capped: vieillesse_capped,
        uncapped: vieillesse_uncapped
      },
      retraite: retraite_sal,
      retraiteDetails: {
        standard: retraite_sal_standard,
        ceg: retraite_sal_ceg,
        cet: retraite_sal_cet
      },
      prevoyance: prevoyance_sal,
      total: C_sal
    },
    employer: {
      accident,
      fnal,
      cfp,
      csa,
      dialogue,
      sante,
      retraite: retraite_emp,
      retraiteDetails: {
        standard: retraite_emp_std,
        ceg: retraite_emp_ceg,
        cet: retraite_emp_cet
      },
      prevoyance: prevoyance_emp,
      prevoyanceDetails: {
        t1_std: prevoyance_emp_t1_std,
        t1_add: prevoyance_emp_t1_add,
        t2_add: prevoyance_emp_t2_add
      },
      chomage,
      chomageDetails: {
        t1: chomage_t1,
        t2: chomage_t2
      },
      total: C_emp
    },
    totals: {
      netSalary: salNet,
      employeeContributions: C_sal,
      employerContributions: C_emp,
      totalCostBeforeTaxCredit: total_cost,
      taxCredit: tax_credit,
      netCost: net_cost,
      hourlyCostBeforeTaxCredit: round(total_cost / nbHr),
      hourlyNetCost: round(net_cost / nbHr)
    }
  };
}

/**
 * Inverse Law: Solves for the exact Net Hourly Wage required to achieve
 * a target total out-of-pocket employer cost.
 * 
 * @param {number} targetCost - Target monthly cost.
 * @param {number} nbHr - Hours worked in the month.
 * @param {boolean} accountForTaxCredit - If true, targetCost is the after-tax-credit cost.
 * @returns {number} Exact net hourly rate (2 decimals).
 */
export function calculateInverse(targetCost, nbHr, accountForTaxCredit = false) {
  const min_net = 10.82;
  
  // If we account for credit d'impôt, the total cost before credit is exactly double
  const actualTargetCost = accountForTaxCredit ? round(targetCost * 2) : targetCost;
  
  const min_cost_details = calculateForward(min_net, nbHr);
  const min_cost = min_cost_details.totals.totalCostBeforeTaxCredit;
  
  if (actualTargetCost <= min_cost) {
    return min_net;
  }
  
  // Standard bisection solver
  let low = min_net;
  let high = Math.max(min_net, actualTargetCost / nbHr) * 1.5; // generous upper bound
  
  for (let step = 0; step < 50; step++) {
    const mid = (low + high) / 2;
    const details = calculateForward(mid, nbHr);
    const cost = details.totals.totalCostBeforeTaxCredit;
    if (cost < actualTargetCost) {
      low = mid;
    } else {
      high = mid;
    }
  }
  
  // Search precise 2-decimal candidates around the bisection solution
  let best_candidate = min_net;
  let best_diff = Infinity;
  
  const start_cand = Math.max(min_net, round(low) - 0.05);
  for (let i = 0; i <= 10; i++) {
    const cand = round(start_cand + i * 0.01);
    const details = calculateForward(cand, nbHr);
    const cost = details.totals.totalCostBeforeTaxCredit;
    const diff = Math.abs(cost - actualTargetCost);
    if (diff < best_diff) {
      best_diff = diff;
      best_candidate = cand;
    }
  }
  
  return best_candidate;
}

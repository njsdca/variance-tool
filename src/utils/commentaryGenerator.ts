import type { VarianceRecord, Commentary, CommentarySection, PromoTypeSection, CommentaryDriver } from '../types/variance';
import { VARIANCE_TYPE_MAPPING } from '../types/variance';

// Format number as $Xk shorthand
export function formatCurrency(amount: number): string {
  const absAmount = Math.abs(amount);
  const sign = amount < 0 ? '(' : '';
  const endSign = amount < 0 ? ')' : '';

  if (absAmount >= 1000) {
    const inK = absAmount / 1000;
    // Round to 1 decimal if needed, otherwise show whole number
    const formatted = inK % 1 === 0 ? inK.toFixed(0) : inK.toFixed(1);
    return `${sign}$${formatted}K${endSign}`;
  }

  return `${sign}$${absAmount.toFixed(0)}${endSign}`;
}

// Clean up promotion description - remove redundant customer name
function cleanDescription(customer: string, promotionName: string): string {
  let desc = (promotionName || '').trim();
  const customerLower = (customer || '').toLowerCase().trim();

  if (!customerLower) {
    return desc || 'Unknown';
  }

  // Extract meaningful words from customer name (ignore short words like "of", "-", etc.)
  const customerWords = customerLower
    .split(/[\s\-]+/)
    .filter((w) => w.length > 2);

  // Remove leading words from promotion that match customer name words
  const descWords = desc.split(/\s+/);
  let startIndex = 0;

  for (let i = 0; i < descWords.length && i < 5; i++) {
    const wordLower = descWords[i].toLowerCase().replace(/[^a-z0-9]/g, '');
    if (wordLower.length <= 2) {
      startIndex = i + 1;
      continue;
    }
    // Check if this word is part of the customer name
    const isCustomerWord = customerWords.some(
      (cw) => cw === wordLower || cw.includes(wordLower) || wordLower.includes(cw)
    );
    if (isCustomerWord) {
      startIndex = i + 1;
    } else {
      break;
    }
  }

  desc = descWords.slice(startIndex).join(' ').trim();

  // Remove common prefixes that might remain
  if (desc.startsWith('-')) {
    desc = desc.slice(1).trim();
  }

  // If description is empty, just return customer name
  if (!desc) {
    return customer;
  }

  // Return customer + cleaned description
  return `${customer} ${desc}`;
}

// Type for internal grouping structure
interface PromoTypeData {
  total: number;
  items: Map<string, { description: string; amount: number }>;
}

interface CategoryData {
  total: number;
  promoTypes: Map<string, PromoTypeData>;
}

// Generate commentary from filtered variance records
export function generateCommentary(records: VarianceRecord[]): Commentary {
  // Initialize sections with promo type grouping
  const sections: Record<string, CategoryData> = {
    changedSinceLBE2: { total: 0, promoTypes: new Map() },
    favorableClosures: { total: 0, promoTypes: new Map() },
    overPerformance: { total: 0, promoTypes: new Map() },
    promotionMiss: { total: 0, promoTypes: new Map() },
  };

  // Group records by category > promo type > promotion
  for (const record of records) {
    const category = VARIANCE_TYPE_MAPPING[record.varianceType];

    if (category && sections[category]) {
      sections[category].total += record.sumOfVariance;

      const promoType = record.promotionType || 'Other';

      // Get or create promo type bucket
      if (!sections[category].promoTypes.has(promoType)) {
        sections[category].promoTypes.set(promoType, { total: 0, items: new Map() });
      }
      const promoTypeData = sections[category].promoTypes.get(promoType)!;
      promoTypeData.total += record.sumOfVariance;

      // Create a key for grouping - use customer + promotion name
      const description = cleanDescription(record.customer, record.promotionName);
      const key = description.toLowerCase();

      const existing = promoTypeData.items.get(key);
      if (existing) {
        existing.amount += record.sumOfVariance;
      } else {
        promoTypeData.items.set(key, {
          description,
          amount: record.sumOfVariance,
        });
      }
    }
  }

  // Process promo type into drivers (top 5 + other)
  const processPromoType = (promoTypeData: PromoTypeData): CommentaryDriver[] => {
    const itemsArray = Array.from(promoTypeData.items.values());
    const sortedItems = itemsArray.sort(
      (a, b) => Math.abs(b.amount) - Math.abs(a.amount)
    );

    const topItems = sortedItems.slice(0, 5);
    const otherItems = sortedItems.slice(5);

    const drivers: CommentaryDriver[] = topItems.map((item) => ({
      description: item.description,
      amount: item.amount,
    }));

    // Add "Other" if there are more items
    if (otherItems.length > 0) {
      const otherTotal = otherItems.reduce((sum, item) => sum + item.amount, 0);
      if (Math.abs(otherTotal) > 0) {
        drivers.push({
          description: `Other (${otherItems.length} items)`,
          amount: otherTotal,
        });
      }
    }

    return drivers;
  };

  // Process section into promo types sorted by absolute total
  const processSection = (categoryData: CategoryData): PromoTypeSection[] => {
    const promoTypesArray: PromoTypeSection[] = [];

    for (const [promoType, data] of categoryData.promoTypes) {
      promoTypesArray.push({
        promoType,
        total: data.total,
        drivers: processPromoType(data),
      });
    }

    // Sort promo types by absolute total (descending)
    return promoTypesArray.sort((a, b) => Math.abs(b.total) - Math.abs(a.total));
  };

  const totalVariance = Object.values(sections).reduce((sum, s) => sum + s.total, 0);

  // Generate summary
  const summary = generateSummary(sections, totalVariance);

  return {
    changedSinceLBE2: {
      title: 'Changed since LBE2',
      total: sections.changedSinceLBE2.total,
      promoTypes: processSection(sections.changedSinceLBE2),
    },
    favorableClosures: {
      title: 'Favorable Closures',
      total: sections.favorableClosures.total,
      promoTypes: processSection(sections.favorableClosures),
    },
    overPerformance: {
      title: 'Over Performance',
      total: sections.overPerformance.total,
      promoTypes: processSection(sections.overPerformance),
    },
    promotionMiss: {
      title: 'Promotion Miss',
      total: sections.promotionMiss.total,
      promoTypes: processSection(sections.promotionMiss),
    },
    totalVariance,
    summary,
  };
}

function generateSummary(
  sections: Record<string, CategoryData>,
  totalVariance: number
): string {
  const favorable: string[] = [];
  const unfavorable: string[] = [];

  if (sections.changedSinceLBE2.total > 0) {
    favorable.push('LBE2 changes');
  } else if (sections.changedSinceLBE2.total < 0) {
    unfavorable.push('LBE2 changes');
  }

  if (sections.favorableClosures.total > 0) {
    favorable.push('closures');
  }

  if (sections.overPerformance.total < 0) {
    unfavorable.push('under-accruals');
  }

  if (sections.promotionMiss.total < 0) {
    unfavorable.push('promotion misses');
  }

  const netDirection = totalVariance >= 0 ? 'favorable' : 'unfavorable';

  let summary = `Net ${netDirection}`;

  if (favorable.length > 0) {
    summary += ` driven by ${favorable.join(' and ')}`;
  }

  if (unfavorable.length > 0) {
    summary += favorable.length > 0
      ? `, partially offset by ${unfavorable.join(' and ')}`
      : ` driven by ${unfavorable.join(' and ')}`;
  }

  return summary + '.';
}

// Format commentary for display/copy
export function formatCommentaryText(commentary: Commentary): string {
  const lines: string[] = [];

  const formatSection = (section: CommentarySection) => {
    if (section.promoTypes.length === 0 && section.total === 0) return;

    lines.push(`${section.title}: ${formatCurrency(section.total)}`);

    for (const promoType of section.promoTypes) {
      lines.push(`  ${promoType.promoType}: ${formatCurrency(promoType.total)}`);
      for (const driver of promoType.drivers) {
        lines.push(`    ${formatCurrency(driver.amount)} from ${driver.description}`);
      }
    }

    lines.push('');
  };

  formatSection(commentary.changedSinceLBE2);
  formatSection(commentary.favorableClosures);
  formatSection(commentary.overPerformance);
  formatSection(commentary.promotionMiss);

  lines.push(`Total Variance: ${formatCurrency(commentary.totalVariance)}`);
  lines.push(`  ${commentary.summary}`);

  return lines.join('\n');
}

// Format commentary as rich HTML for copying
export function formatCommentaryHTML(commentary: Commentary): string {
  const formatSection = (section: CommentarySection): string => {
    if (section.promoTypes.length === 0 && section.total === 0) return '';

    let html = `<p><strong>${section.title}:</strong> ${formatCurrency(section.total)}<br/>`;

    for (const promoType of section.promoTypes) {
      html += `&nbsp;&nbsp;<strong>${promoType.promoType}:</strong> ${formatCurrency(promoType.total)}<br/>`;
      for (const driver of promoType.drivers) {
        html += `&nbsp;&nbsp;&nbsp;&nbsp;${formatCurrency(driver.amount)} from ${driver.description}<br/>`;
      }
    }

    html += '</p>';
    return html;
  };

  let html = '';
  html += formatSection(commentary.changedSinceLBE2);
  html += formatSection(commentary.favorableClosures);
  html += formatSection(commentary.overPerformance);
  html += formatSection(commentary.promotionMiss);

  html += `<p><strong>Total Variance:</strong> ${formatCurrency(commentary.totalVariance)}<br/>`;
  html += `&nbsp;&nbsp;${commentary.summary}</p>`;

  return html;
}

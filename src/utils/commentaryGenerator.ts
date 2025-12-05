import type { VarianceRecord, Commentary, CommentarySection } from '../types/variance';
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

// Generate commentary from filtered variance records
export function generateCommentary(records: VarianceRecord[]): Commentary {
  // Initialize sections
  const sections: Record<string, { total: number; items: Map<string, { description: string; amount: number }> }> = {
    changedSinceLBE2: { total: 0, items: new Map() },
    favorableClosures: { total: 0, items: new Map() },
    overPerformance: { total: 0, items: new Map() },
    promotionMiss: { total: 0, items: new Map() },
  };

  // Group records by variance type and aggregate by promotion
  for (const record of records) {
    const category = VARIANCE_TYPE_MAPPING[record.varianceType];

    if (category && sections[category]) {
      sections[category].total += record.sumOfVariance;

      // Create a key for grouping - use customer + promotion name
      const description = cleanDescription(record.customer, record.promotionName);
      const key = description.toLowerCase();

      const existing = sections[category].items.get(key);
      if (existing) {
        existing.amount += record.sumOfVariance;
      } else {
        sections[category].items.set(key, {
          description,
          amount: record.sumOfVariance,
        });
      }
    }
  }

  // Sort items by absolute amount (descending) and take top 5
  const processSection = (section: typeof sections.changedSinceLBE2): CommentarySection => {
    const itemsArray = Array.from(section.items.values());
    const sortedItems = itemsArray.sort(
      (a, b) => Math.abs(b.amount) - Math.abs(a.amount)
    );

    const topItems = sortedItems.slice(0, 5);
    const otherItems = sortedItems.slice(5);

    const drivers = topItems.map((item) => ({
      description: item.description,
      amount: item.amount,
    }));

    // Add "Other minor" if there are more items
    if (otherItems.length > 0) {
      const otherTotal = otherItems.reduce((sum, item) => sum + item.amount, 0);
      if (Math.abs(otherTotal) > 0) {
        drivers.push({
          description: `Other (${otherItems.length} items)`,
          amount: otherTotal,
        });
      }
    }

    return {
      title: '',
      total: section.total,
      drivers,
    };
  };

  const totalVariance = Object.values(sections).reduce((sum, s) => sum + s.total, 0);

  // Generate summary
  const summary = generateSummary(sections, totalVariance);

  return {
    changedSinceLBE2: {
      ...processSection(sections.changedSinceLBE2),
      title: 'Changed since LBE2',
    },
    favorableClosures: {
      ...processSection(sections.favorableClosures),
      title: 'Favorable Closures',
    },
    overPerformance: {
      ...processSection(sections.overPerformance),
      title: 'Over Performance',
    },
    promotionMiss: {
      ...processSection(sections.promotionMiss),
      title: 'Promotion Miss',
    },
    totalVariance,
    summary,
  };
}

function generateSummary(
  sections: Record<string, { total: number; items: Map<string, { description: string; amount: number }> }>,
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
    if (section.drivers.length === 0 && section.total === 0) return;

    lines.push(`${section.title}: ${formatCurrency(section.total)}`);

    for (const driver of section.drivers) {
      lines.push(`  ${formatCurrency(driver.amount)} from ${driver.description}`);
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
    if (section.drivers.length === 0 && section.total === 0) return '';

    let html = `<p><strong>${section.title}:</strong> ${formatCurrency(section.total)}<br/>`;

    for (const driver of section.drivers) {
      html += `&nbsp;&nbsp;${formatCurrency(driver.amount)} from ${driver.description}<br/>`;
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

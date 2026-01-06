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

// Get promotion description - use full promo name for context
function cleanDescription(customer: string, promotionName: string): string {
  const desc = (promotionName || '').trim();

  // If no promotion name, fall back to customer
  if (!desc) {
    return customer || 'Unknown';
  }

  return desc;
}

// Extract key descriptive term from a promo name for summarization
function extractKeyTerm(promoName: string): string {
  let cleaned = promoName.trim();

  // Remove date patterns (Oct 2025, Nov_Dec'25, Dec2025, 2025, etc.)
  // Use word boundaries to avoid matching "Mar" in "Market", "Aug" in "August", etc.
  cleaned = cleaned
    .replace(/[_\s,]*\b(January|February|March|April|May|June|July|August|September|October|November|December)\b[_\s']*\d{0,4}/gi, '')
    .replace(/[_\s,]*\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\b[_\s']*\d{0,4}/gi, '')
    .replace(/[_\s]*'\d{2}/g, '')
    .replace(/[_\s]*\b\d{4}\b/g, '')
    .replace(/\s*\b(Q[1-4])\b\s*/gi, '')
    .trim();

  // Check if underscore-separated format (e.g., Target_PromoType_Details)
  if (cleaned.includes('_')) {
    const parts = cleaned.split('_').map(p => p.trim()).filter(p => p);

    // Remove first part if it looks like a customer prefix (single capitalized word)
    if (parts.length > 1 && /^[A-Z][a-z]+$/.test(parts[0])) {
      parts.shift();
    }

    // Take key parts (up to 2 meaningful segments)
    const keyParts = parts.slice(0, 2);

    // Convert camelCase to spaces and clean up
    const result = keyParts
      .map(p => p
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
      )
      .join(' ')
      .trim();

    return result || promoName;
  }

  // Space-separated format - extract retailer/company name (first capitalized words)
  // Stop at: dash separator, size indicators, numbers, lowercase words

  // First check for " - " separator (e.g., "Food Lion - 1.15oz...")
  const dashIndex = cleaned.indexOf(' - ');
  if (dashIndex > 0) {
    return cleaned.substring(0, dashIndex).trim();
  }

  // Extract leading company name - stop at size/count indicators or product details
  const words = cleaned.split(/\s+/);
  const companyWords: string[] = [];

  for (let i = 0; i < words.length; i++) {
    const word = words[i];

    // Stop at size indicators (1.15oz, 8ct, 6ct, etc.) - also catch ".15oz" patterns
    if (/^\d/.test(word) || /^\.?\d*\.?\d+(oz|ct|lb)$/i.test(word)) {
      break;
    }
    // Stop at common product/promo keywords that indicate end of company name
    if (/^(TPR|EDLP|EDLC|POP|Scan|Display|Shipper|Slotting|Freefills|MCBs|Allowance|Fees?|Cycle|Line|Drive|Holly|Fairshare|Merchandising|New|Item|Intro|Check|Lanes|Endcap)$/i.test(word)) {
      break;
    }
    // Stop at words with special chars mid-word (except apostrophe for possessives)
    if (/[&()]/.test(word)) {
      break;
    }
    // Handle "All Others" pattern - include it as part of company name
    if (word === 'All' && i + 1 < words.length && words[i + 1] === 'Others') {
      companyWords.push('All Others');
      break; // Stop after "All Others"
    }
    if (word === 'Others' && companyWords[companyWords.length - 1] === 'All') {
      continue; // Already handled above
    }
    companyWords.push(word);
  }

  // If we got something meaningful, return it
  if (companyWords.length > 0) {
    let result = companyWords.join(' ').replace(/[,\-]+$/, '').trim();
    // Add space in camelCase words (e.g., "MetropolitanLine" -> "Metropolitan Line")
    result = result.replace(/([a-z])([A-Z])/g, '$1 $2');
    return result;
  }

  return promoName;
}

// Format a list of terms with commas and "and"
function formatTermList(terms: string[]): string {
  if (terms.length === 0) return '';
  if (terms.length === 1) return terms[0];
  if (terms.length === 2) return `${terms[0]} and ${terms[1]}`;
  return `${terms.slice(0, -1).join(', ')}, and ${terms[terms.length - 1]}`;
}

// Generate a single-line summary for drivers
function summarizeDrivers(drivers: Array<{ description: string; amount: number }>, total: number): string {
  if (drivers.length === 0) return '';

  // If single driver, use "Entire variance from"
  if (drivers.length === 1) {
    return `Entire variance from ${drivers[0].description}`;
  }

  const topDriver = drivers[0];
  const topDriverPct = Math.abs(topDriver.amount) / Math.abs(total);

  // If one driver dominates (>90% of total), use "Majority from"
  if (topDriverPct > 0.9) {
    return `Majority from ${topDriver.description}`;
  }

  // Multiple drivers - extract key terms, aggregate amounts by term, and list
  const termTotals = new Map<string, number>();

  for (const driver of drivers) {
    const term = extractKeyTerm(driver.description);
    termTotals.set(term, (termTotals.get(term) || 0) + driver.amount);
  }

  // Sort by absolute amount descending
  const sortedTerms = Array.from(termTotals.entries())
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));

  // Filter out insignificant amounts (less than 1% of total)
  const significantTerms = sortedTerms.filter(([, amount]) =>
    Math.abs(amount) >= Math.abs(total) * 0.01
  );

  // Limit to top 5 contributors
  const topTerms = significantTerms.slice(0, 5);
  const remainingTerms = significantTerms.slice(5);

  // Format each term with its amount
  const termsWithAmounts = topTerms.map(([term, amount]) =>
    `${term} ${formatCurrency(amount)}`
  );

  // Add "and X others" if there are more
  if (remainingTerms.length > 0) {
    const othersTotal = remainingTerms.reduce((sum, [, amt]) => sum + amt, 0);
    const otherLabel = remainingTerms.length === 1 ? 'other' : 'others';
    termsWithAmounts.push(`${remainingTerms.length} ${otherLabel} ${formatCurrency(othersTotal)}`);
  }

  return formatTermList(termsWithAmounts);
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

  // Process promo type into a single summary driver
  const processPromoType = (promoTypeData: PromoTypeData): CommentaryDriver[] => {
    const itemsArray = Array.from(promoTypeData.items.values());
    const sortedItems = itemsArray.sort(
      (a, b) => Math.abs(b.amount) - Math.abs(a.amount)
    );

    // Generate a single summary line for all drivers
    const summary = summarizeDrivers(sortedItems, promoTypeData.total);

    return [{
      description: summary,
      amount: promoTypeData.total,
    }];
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
        lines.push(`    ${driver.description}`);
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
        html += `&nbsp;&nbsp;&nbsp;&nbsp;${driver.description}<br/>`;
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

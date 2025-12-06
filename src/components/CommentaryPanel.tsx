import { useState } from 'react';
import type { VarianceRecord, Commentary, CommentarySection, PromoTypeSection } from '../types/variance';
import {
  generateCommentary,
  formatCurrency,
  formatCommentaryText,
  formatCommentaryHTML,
} from '../utils/commentaryGenerator';

interface CommentaryPanelProps {
  data: VarianceRecord[];
  onGenerate?: () => void;
}

function PromoTypeAccordion({ promoType }: { promoType: PromoTypeSection }) {
  const [isOpen, setIsOpen] = useState(false);
  const amountClass = promoType.total >= 0 ? 'positive' : 'negative';

  return (
    <div className="promo-type-accordion">
      <button
        className={`promo-type-header ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="accordion-icon">{isOpen ? '▼' : '▶'}</span>
        <span className="promo-type-name">{promoType.promoType}</span>
        <span className={`promo-type-amount ${amountClass}`}>
          {formatCurrency(promoType.total)}
        </span>
      </button>
      {isOpen && (
        <ul className="commentary-drivers">
          {promoType.drivers.map((driver, index) => (
            <li key={index} className="commentary-driver">
              <span className="commentary-driver-amount">
                {formatCurrency(driver.amount)}
              </span>
              <span className="commentary-driver-desc">from {driver.description}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CategoryAccordion({ section }: { section: CommentarySection }) {
  const [isOpen, setIsOpen] = useState(false);

  if (section.promoTypes.length === 0 && section.total === 0) {
    return null;
  }

  const amountClass = section.total >= 0 ? 'positive' : 'negative';

  return (
    <div className="category-accordion">
      <button
        className={`category-header ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="accordion-icon">{isOpen ? '▼' : '▶'}</span>
        <span className="category-title">{section.title}</span>
        <span className={`category-amount ${amountClass}`}>
          {formatCurrency(section.total)}
        </span>
      </button>
      {isOpen && (
        <div className="category-content">
          {section.promoTypes.map((promoType, index) => (
            <PromoTypeAccordion key={index} promoType={promoType} />
          ))}
        </div>
      )}
    </div>
  );
}

export function CommentaryPanel({ data }: CommentaryPanelProps) {
  const [commentary, setCommentary] = useState<Commentary | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerate = () => {
    if (data.length === 0) return;
    const generated = generateCommentary(data);
    setCommentary(generated);
  };

  const handleCopy = async (format: 'text' | 'rich') => {
    if (!commentary) return;

    try {
      if (format === 'rich') {
        const html = formatCommentaryHTML(commentary);
        const text = formatCommentaryText(commentary);

        await navigator.clipboard.write([
          new ClipboardItem({
            'text/html': new Blob([html], { type: 'text/html' }),
            'text/plain': new Blob([text], { type: 'text/plain' }),
          }),
        ]);
      } else {
        const text = formatCommentaryText(commentary);
        await navigator.clipboard.writeText(text);
      }

      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleClear = () => {
    setCommentary(null);
  };

  const totalAmountClass = commentary ? (commentary.totalVariance >= 0 ? 'positive' : 'negative') : '';

  return (
    <div className="card">
      <div className="card-header">
        <h3>Commentary</h3>
        {data.length > 0 && (
          <div className="commentary-header-actions">
            {commentary && (
              <button className="btn btn-secondary btn-sm" onClick={handleClear}>
                Clear
              </button>
            )}
            <button className="btn btn-primary btn-sm" onClick={handleGenerate}>
              {commentary ? 'Regenerate' : 'Generate'}
            </button>
          </div>
        )}
      </div>
      <div className="card-body commentary-body">
        {!commentary ? (
          <div className="commentary-empty">
            <p>Click "Generate" to create commentary from the filtered data.</p>
          </div>
        ) : (
          <>
            <div className="commentary-sections">
              <CategoryAccordion section={commentary.changedSinceLBE2} />
              <CategoryAccordion section={commentary.favorableClosures} />
              <CategoryAccordion section={commentary.overPerformance} />
              <CategoryAccordion section={commentary.promotionMiss} />
            </div>

            <div className="commentary-total">
              <div className="commentary-total-header">
                <span className="commentary-total-title">Total Variance</span>
                <span className={`commentary-total-amount ${totalAmountClass}`}>
                  {formatCurrency(commentary.totalVariance)}
                </span>
              </div>
              <p className="commentary-summary">{commentary.summary}</p>
            </div>

            <div className="copy-btn-container">
              {copied ? (
                <div className="copy-success">
                  <span>✓</span> Copied to clipboard!
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    className="btn btn-primary"
                    onClick={() => handleCopy('rich')}
                  >
                    Copy with Formatting
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={() => handleCopy('text')}
                  >
                    Copy as Text
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

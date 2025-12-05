import { useState } from 'react';
import type { VarianceRecord, Commentary, CommentarySection } from '../types/variance';
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

function CommentarySectionDisplay({ section }: { section: CommentarySection }) {
  if (section.drivers.length === 0 && section.total === 0) {
    return null;
  }

  const amountClass = section.total >= 0 ? 'positive' : 'negative';

  return (
    <div className="commentary-section">
      <div className="commentary-section-header">
        <h4 className="commentary-section-title">{section.title}</h4>
        <span className={`commentary-section-amount ${amountClass}`}>
          {formatCurrency(section.total)}
        </span>
      </div>
      <ul className="commentary-drivers">
        {section.drivers.map((driver, index) => (
          <li key={index} className="commentary-driver">
            <span className="commentary-driver-amount">
              {formatCurrency(driver.amount)}
            </span>
            <span>from {driver.description}</span>
          </li>
        ))}
      </ul>
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

  // Show generate button when no commentary yet
  if (!commentary) {
    return (
      <div className="card">
        <div className="card-header">
          <h3>Commentary</h3>
        </div>
        <div className="card-body">
          <div className="empty-state">
            <div className="empty-state-icon">💬</div>
            <p className="empty-state-text">
              {data.length === 0
                ? 'Load data and apply filters to generate commentary.'
                : `${data.length.toLocaleString()} records selected.`}
            </p>
            {data.length > 0 && (
              <button className="btn btn-primary mt-2" onClick={handleGenerate}>
                Generate Commentary
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const totalAmountClass = commentary.totalVariance >= 0 ? 'positive' : 'negative';

  return (
    <div className="card">
      <div className="card-header">
        <h3>Commentary</h3>
        <button className="btn btn-secondary btn-sm" onClick={handleClear}>
          Clear
        </button>
      </div>
      <div className="card-body">
        <CommentarySectionDisplay section={commentary.changedSinceLBE2} />
        <CommentarySectionDisplay section={commentary.favorableClosures} />
        <CommentarySectionDisplay section={commentary.overPerformance} />
        <CommentarySectionDisplay section={commentary.promotionMiss} />

        <div className="commentary-total">
          <div className="commentary-total-header">
            <h4 className="commentary-total-title">Total Variance</h4>
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
      </div>
    </div>
  );
}

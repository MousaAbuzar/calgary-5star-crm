import { useState, useRef } from 'react';
import { importCustomers } from '../api';
import toast from 'react-hot-toast';

// --- CSV parsing ---

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = parseCSVLine(lines[0]).map((h) => h.toLowerCase().replace(/\s+/g, ''));
  return lines.slice(1).map((line) => {
    const values = parseCSVLine(line);
    const row = {};
    headers.forEach((h, i) => { row[h] = values[i] || ''; });
    return row;
  });
}

// Maps flexible column name spellings to our schema fields.
// Supports your spreadsheet format: Submission Date, Name, Phone number, Email, Address
function mapRow(row) {
  const get = (...keys) => {
    for (const k of keys) if (row[k]) return row[k];
    return '';
  };

  // Handle single "Name" column OR separate firstName/lastName columns
  let firstName = get('firstname', 'first_name', 'first');
  let lastName  = get('lastname',  'last_name',  'last');
  if (!firstName) {
    const full = get('name', 'fullname', 'customername', 'client');
    if (full) {
      const spaceIdx = full.indexOf(' ');
      if (spaceIdx > -1) {
        firstName = full.substring(0, spaceIdx).trim();
        lastName  = full.substring(spaceIdx + 1).trim();
      } else {
        firstName = full.trim();
        lastName  = '';
      }
    }
  }

  // Strip leading apostrophe Excel adds to force-text phone numbers (e.g. '4031234567)
  const rawPhone = get('phone', 'phonenumber', 'phone#', 'telephone', 'mobile');
  const phone = rawPhone.replace(/^'+/, '').trim();

  const tagsRaw = get('tags', 'tag');
  const status = ['active', 'inactive', 'prospect'].includes(get('status')) ? get('status') : 'prospect';
  const source = ['website', 'referral', 'social_media', 'cold_outreach', 'other'].includes(get('source'))
    ? get('source') : 'other';

  return {
    firstName,
    lastName,
    email: get('email'),
    phone,
    address: {
      street:   get('street', 'address'),
      city:     get('city', 'town'),
      postcode: get('postcode', 'zip', 'postal'),
    },
    tags:   tagsRaw ? tagsRaw.split(';').map((t) => t.trim()).filter(Boolean) : [],
    notes:  get('notes', 'note'),
    status,
    source,
  };
}

// --- Template download ---

const TEMPLATE_CSV =
  'Submission Date,Name,Phone number,Email,Address\n' +
  'Aug 19 2025,Jane Smith,4031234567,jane@example.com,69 Masters Street SE\n' +
  'Aug 17 2025,Ashley,4039998888,ashley@example.com,142 Masters Row\n';

function downloadTemplate() {
  const blob = new Blob([TEMPLATE_CSV], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'customer_import_template.csv';
  a.click();
  URL.revokeObjectURL(url);
}

// --- Component ---

function CustomerImport({ onClose }) {
  const [step, setStep] = useState('upload'); // 'upload' | 'preview' | 'done'
  const [rows, setRows] = useState([]);
  const [results, setResults] = useState(null);
  const [importing, setImporting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef();

  const processFile = (file) => {
    if (!file || !file.name.endsWith('.csv')) {
      toast.error('Please select a .csv file');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const parsed = parseCSV(e.target.result).map(mapRow);
      const valid = parsed.filter((r) => r.firstName);
      if (valid.length === 0) {
        toast.error('No valid rows found. Make sure your CSV has a Name column.');
        return;
      }
      setRows(valid);
      setStep('preview');
    };
    reader.readAsText(file);
  };

  const handleFileInput = (e) => processFile(e.target.files[0]);
  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    processFile(e.dataTransfer.files[0]);
  };

  const handleImport = async () => {
    setImporting(true);
    try {
      const res = await importCustomers(rows);
      setResults(res.data);
      setStep('done');
    } catch (err) {
      toast.error('Import failed');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={() => onClose(step === 'done')}>
      <div className="modal modal-large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Import Customers from CSV</h2>
          <button className="close-btn" onClick={() => onClose(step === 'done')}>✕</button>
        </div>

        {/* Step 1 — Upload */}
        {step === 'upload' && (
          <div className="form">
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
              Upload a CSV file with your customer data. Each row becomes one customer.
              Required column: <strong>Name</strong>. Email is recommended but optional.
            </p>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ alignSelf: 'flex-start' }}
              onClick={downloadTemplate}
            >
              Download Template CSV
            </button>

            <div
              className={`import-dropzone${dragOver ? ' import-dropzone--active' : ''}`}
              onClick={() => fileRef.current.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
            >
              <div className="import-dropzone-icon">📂</div>
              <p>Drag and drop your CSV here, or click to browse</p>
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>.csv files only</p>
              <input
                ref={fileRef}
                type="file"
                accept=".csv"
                style={{ display: 'none' }}
                onChange={handleFileInput}
              />
            </div>

            <div className="import-col-hint">
              <strong>Matches your spreadsheet format:</strong> Submission Date, Name, Phone number, Email, Address.
              Also works with: firstName, lastName, street, city, postcode, tags, notes, status, source.
              Single-word names (e.g. "Ashley") are imported as-is.
            </div>
          </div>
        )}

        {/* Step 2 — Preview */}
        {step === 'preview' && (
          <div className="form">
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
              Found <strong>{rows.length} valid customer{rows.length !== 1 ? 's' : ''}</strong> in
              your file. Review the first few rows below, then click Import.
            </p>
            <div style={{ overflowX: 'auto' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>City</th>
                    <th>Status</th>
                    <th>Tags</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 8).map((r, i) => (
                    <tr key={i}>
                      <td>{r.firstName} {r.lastName}</td>
                      <td>{r.email}</td>
                      <td>{r.phone || '—'}</td>
                      <td>{r.address?.city || '—'}</td>
                      <td><span className={`badge badge-${r.status}`}>{r.status}</span></td>
                      <td>{r.tags.join(', ') || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {rows.length > 8 && (
              <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                …and {rows.length - 8} more rows not shown.
              </p>
            )}
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setStep('upload')}>
                Back
              </button>
              <button className="btn btn-primary" onClick={handleImport} disabled={importing}>
                {importing ? 'Importing…' : `Import ${rows.length} Customers`}
              </button>
            </div>
          </div>
        )}

        {/* Step 3 — Done */}
        {step === 'done' && results && (
          <div className="form">
            <div className="import-results">
              <div className="import-result-box import-result-box--success">
                <div className="import-result-number">{results.created}</div>
                <div className="import-result-label">Imported successfully</div>
              </div>
              {results.failed > 0 && (
                <div className="import-result-box import-result-box--fail">
                  <div className="import-result-number">{results.failed}</div>
                  <div className="import-result-label">Skipped (duplicate email or invalid)</div>
                </div>
              )}
            </div>
            {results.errors.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8 }}>
                  Skipped rows:
                </p>
                {results.errors.map((e, i) => (
                  <div key={i} style={{ fontSize: 13, color: 'var(--danger)', marginBottom: 4 }}>
                    {e.email}: {e.error}
                  </div>
                ))}
              </div>
            )}
            <div className="modal-footer">
              <button className="btn btn-primary" onClick={() => onClose(true)}>
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default CustomerImport;

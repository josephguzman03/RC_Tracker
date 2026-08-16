import { useState, useRef } from 'react'
import { parseExcelFile } from '../../utils/parseExcel'
import { useSessionContext } from '../../context/SessionContext'
import './FileUpload.css'

export default function FileUpload({ onSuccess }) {
  const { mergeSessions, replaceSessions, sessions } = useSessionContext()
  const [isDragging, setDragging] = useState(false)
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState(null)
  const [fileName, setFileName] = useState(null)
  const [importMode, setImportMode] = useState('merge')
  const [importResult, setImportResult] = useState(null)
  const inputRef = useRef(null)

  async function handleFile(file) {
    if (!file) return

    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      setError('Only .xlsx files are supported')
      setStatus('error')
      return
    }

    setStatus('parsing')
    setError(null)
    setFileName(file.name)
    setImportResult(null)

    try {
      const parsedSessions = await parseExcelFile(file)
      const result = importMode === 'merge'
        ? mergeSessions(parsedSessions)
        : replaceSessions(parsedSessions)

      setImportResult(result)
      setStatus('success')
      onSuccess?.(result)
    } catch (err) {
      setError(err.message)
      setStatus('error')
    }
  }

  function onDrop(e) {
    e.preventDefault()
    setDragging(false)
    handleFile(e.dataTransfer.files[0])
  }

  function onDragOver(e) {
    e.preventDefault()
    setDragging(true)
  }

  function onDragLeave() {
    setDragging(false)
  }

  function onInputChange(e) {
    handleFile(e.target.files[0])
  }

  function resetPicker() {
    setStatus('idle')
    setError(null)
    setFileName(null)
    setImportResult(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  const successText = importResult?.mode === 'merge'
    ? `${importResult.added} new session${importResult.added === 1 ? '' : 's'} added · ${importResult.skipped} already imported · ${importResult.total} saved locally`
    : `${importResult?.total ?? sessions.length} sessions replaced and saved locally`

  return (
    <div className="file-upload-wrap">
      <div className="import-mode-row">
        <div>
          <p className="import-mode-title">Import behavior</p>
          <p className="import-mode-sub">Merge is best for an Excel file that keeps growing over time.</p>
        </div>
        <div className="import-mode-toggle" role="group" aria-label="Excel import behavior">
          <button
            type="button"
            className={`import-mode-btn ${importMode === 'merge' ? 'active' : ''}`}
            onClick={() => setImportMode('merge')}
            disabled={status === 'parsing'}
          >
            Merge new rows
          </button>
          <button
            type="button"
            className={`import-mode-btn ${importMode === 'replace' ? 'active' : ''}`}
            onClick={() => setImportMode('replace')}
            disabled={status === 'parsing'}
          >
            Replace all
          </button>
        </div>
      </div>

      {status === 'success' ? (
        <div className="upload-success">
          <div className="upload-success-icon">✓</div>
          <div className="upload-success-text">
            <p className="upload-success-name">{fileName}</p>
            <p className="upload-success-sub">{successText}</p>
          </div>
          <button className="upload-reset-btn" onClick={resetPicker}>
            Import Another
          </button>
        </div>
      ) : (
        <div
          className={`upload-zone ${isDragging ? 'dragging' : ''} ${status === 'error' ? 'errored' : ''}`}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onClick={() => inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx"
            className="upload-input"
            onChange={onInputChange}
          />
          <span className="upload-zone-icon">
            {status === 'parsing' ? '⟳' : '▦'}
          </span>
          <p className="upload-zone-title">
            {status === 'parsing' ? 'Importing...' : importMode === 'merge' ? 'Merge your updated session log' : 'Replace saved sessions'}
          </p>
          <p className="upload-zone-sub">
            {status === 'error'
              ? error
              : importMode === 'merge'
                ? 'Existing rows are skipped automatically. Only new rows are added.'
                : 'This will replace the locally saved tracker dataset with this spreadsheet.'}
          </p>
        </div>
      )}
    </div>
  )
}

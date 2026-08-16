import { useState, useRef } from 'react'
import { parseTrackerWorkbookFile } from '../../utils/parseExcel'
import { useSessionContext } from '../../context/SessionContext'
import './FileUpload.css'

export default function FileUpload({ onSuccess }) {
  const {
    mergeSessions, replaceSessions, sessions,
    mergeCrossTraining, replaceCrossTraining, crossTraining,
  } = useSessionContext()
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
      const parsed = await parseTrackerWorkbookFile(file)
      const climbingResult = importMode === 'merge'
        ? mergeSessions(parsed.sessions)
        : replaceSessions(parsed.sessions)
      const trainingResult = importMode === 'merge'
        ? mergeCrossTraining(parsed.crossTraining)
        : replaceCrossTraining(parsed.crossTraining)

      const result = {
        mode: importMode,
        climbing: climbingResult,
        crossTraining: trainingResult,
        crossTrainingSheetFound: Boolean(parsed.sheets.crossTraining),
      }
      setImportResult(result)
      setStatus('success')
      onSuccess?.(result)
    } catch (err) {
      setError(err.message)
      setStatus('error')
    }
  }

  function resetPicker() {
    setStatus('idle')
    setError(null)
    setFileName(null)
    setImportResult(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  const climbing = importResult?.climbing
  const training = importResult?.crossTraining
  const successText = importResult?.mode === 'merge'
    ? `${climbing?.added ?? 0} climbing + ${training?.added ?? 0} cross-training rows added · ${climbing?.skipped ?? 0} + ${training?.skipped ?? 0} already imported`
    : `${climbing?.total ?? sessions.length} climbing + ${training?.total ?? crossTraining.length} cross-training rows saved locally`

  return (
    <div className="file-upload-wrap">
      <div className="import-mode-row">
        <div>
          <p className="import-mode-title">Import behavior</p>
          <p className="import-mode-sub">One workbook can now contain both Sessions and Cross Training sheets.</p>
        </div>
        <div className="import-mode-toggle" role="group" aria-label="Excel import behavior">
          <button type="button" className={`import-mode-btn ${importMode === 'merge' ? 'active' : ''}`} onClick={() => setImportMode('merge')} disabled={status === 'parsing'}>Merge new rows</button>
          <button type="button" className={`import-mode-btn ${importMode === 'replace' ? 'active' : ''}`} onClick={() => setImportMode('replace')} disabled={status === 'parsing'}>Replace all</button>
        </div>
      </div>

      {status === 'success' ? (
        <div className="upload-success">
          <div className="upload-success-icon">✓</div>
          <div className="upload-success-text">
            <p className="upload-success-name">{fileName}</p>
            <p className="upload-success-sub">{successText}</p>
            {!importResult.crossTrainingSheetFound && (
              <p className="upload-training-note">No Cross Training sheet found — climbing import still completed normally.</p>
            )}
          </div>
          <button className="upload-reset-btn" onClick={resetPicker}>Import Another</button>
        </div>
      ) : (
        <div
          className={`upload-zone ${isDragging ? 'dragging' : ''} ${status === 'error' ? 'errored' : ''}`}
          onDrop={e => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]) }}
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onClick={() => inputRef.current?.click()}
        >
          <input ref={inputRef} type="file" accept=".xlsx" className="upload-input" onChange={e => handleFile(e.target.files[0])} />
          <span className="upload-zone-icon">{status === 'parsing' ? '⟳' : '▦'}</span>
          <p className="upload-zone-title">{status === 'parsing' ? 'Importing...' : importMode === 'merge' ? 'Merge your updated training log' : 'Replace saved training data'}</p>
          <p className="upload-zone-sub">{status === 'error' ? error : 'Reads climbing from Sessions and optional strength/cardio from Cross Training.'}</p>
        </div>
      )}
    </div>
  )
}

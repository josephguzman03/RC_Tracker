import { useState, useRef } from 'react'
import { parseExcelFile } from '../../utils/parseExcel'
import { useSessionContext } from '../../context/SessionContext'
import './FileUpload.css'

export default function FileUpload({ onSuccess }) {
  const { setSessions }           = useSessionContext()
  const [isDragging, setDragging] = useState(false)
  const [status, setStatus]       = useState('idle')
  const [error, setError]         = useState(null)
  const [fileName, setFileName]   = useState(null)
  const inputRef                  = useRef(null)

  async function handleFile(file) {
    if (!file) return

    if (!file.name.endsWith('.xlsx')) {
      setError('Only .xlsx files are supported')
      setStatus('error')
      return
    }

    setStatus('parsing')
    setError(null)
    setFileName(file.name)

    try {
      const sessions = await parseExcelFile(file)
      setSessions(sessions)
      setStatus('success')
      onSuccess?.(sessions)
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

  function reset() {
    setStatus('idle')
    setError(null)
    setFileName(null)
    setSessions(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="file-upload-wrap">
      {status === 'success' ? (
        <div className="upload-success">
          <div className="upload-success-icon">✓</div>
          <div className="upload-success-text">
            <p className="upload-success-name">{fileName}</p>
            <p className="upload-success-sub">Parsed successfully — app is reading your data</p>
          </div>
          <button className="upload-reset-btn" onClick={reset}>
            Replace
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
            {status === 'parsing' ? 'Parsing...' : 'Drop your session log here'}
          </p>
          <p className="upload-zone-sub">
            {status === 'error'
              ? error
              : 'Click to browse or drag and drop your .xlsx file'}
          </p>
        </div>
      )}
    </div>
  )
}
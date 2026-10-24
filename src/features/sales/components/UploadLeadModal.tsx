import React, { useState, useRef } from 'react'
import { Upload, X, FileSpreadsheet, AlertCircle, Check, Loader2 } from 'lucide-react'
import { uploadLeadsExcel } from '../../../api/leads.api'

interface UploadLeadModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export const UploadLeadModal: React.FC<UploadLeadModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [file, setFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!isOpen) return null

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const validateAndSetFile = (f: File) => {
    setError(null)
    const validExtensions = ['.xlsx', '.xls', '.csv']
    const hasValidExt = validExtensions.some((ext) => f.name.toLowerCase().endsWith(ext))
    if (!hasValidExt) {
      setError('Please select an Excel (.xlsx, .xls) or CSV file.')
      return
    }
    setFile(f)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndSetFile(e.dataTransfer.files[0])
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSetFile(e.target.files[0])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) {
      setError('Please choose a file to upload.')
      return
    }

    setUploading(true)
    setError(null)
    try {
      const res = await uploadLeadsExcel(file)
      if (res.success) {
        setFile(null)
        onSuccess()
        onClose()
      } else {
        setError(res.message || 'Upload failed. Please check file format.')
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to upload leads. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-slate-100 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="text-base font-bold text-slate-900">Import Leads</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Upload an Excel (.xlsx, .xls) or CSV file to import leads.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={uploading}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="mb-4 px-3.5 py-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
              isDragging
                ? 'border-blue-500 bg-blue-50/50'
                : 'border-slate-200 hover:border-blue-400 hover:bg-slate-50/50'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileChange}
              className="hidden"
            />

            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
              <Upload className="w-6 h-6" />
            </div>

            <p className="text-sm font-semibold text-slate-800 mb-1">
              {file ? file.name : 'Click to browse or drag & drop file here'}
            </p>
            <p className="text-xs text-slate-400">
              Supports .xlsx, .xls, .csv (Maximum file size 25MB)
            </p>

            {file && (
              <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-medium border border-emerald-200">
                <Check className="w-3.5 h-3.5" />
                <span>Selected: {file.name}</span>
              </div>
            )}
          </div>

          <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={uploading}
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!file || uploading}
              className={`px-5 py-2 text-xs font-semibold text-white rounded-xl transition-colors flex items-center gap-2 shadow-sm ${
                !file || uploading
                  ? 'bg-slate-300 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 cursor-pointer'
              }`}
            >
              {uploading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{uploading ? 'Uploading...' : 'Import Leads'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

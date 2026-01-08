interface ResizeHandleProps {
  onMouseDown: (e: React.MouseEvent) => void
  isResizing: boolean
}

function ResizeHandle({ onMouseDown, isResizing }: ResizeHandleProps) {
  return (
    <div
      onMouseDown={onMouseDown}
      className={`
        w-1.5 cursor-col-resize flex-shrink-0 relative
        transition-colors duration-150
        ${isResizing ? 'bg-blue-500' : 'bg-gray-200 hover:bg-blue-400'}
      `}
      style={{ touchAction: 'none' }}
      data-export-exclude="true"
    >
      {/* Visual grip indicator */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className={`w-0.5 h-8 rounded-full transition-colors ${isResizing ? 'bg-blue-300' : 'bg-gray-400'}`} />
      </div>
    </div>
  )
}

export default ResizeHandle

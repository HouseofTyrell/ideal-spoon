import { OVERLAY_TEMPLATES, OverlayTemplate } from '../data/overlayTemplates'
import './TemplateSelector.css'

interface TemplateSelectorProps {
  onSelect: (template: OverlayTemplate) => void
  onSkip: () => void
}

function TemplateSelector({ onSelect, onSkip }: TemplateSelectorProps) {
  return (
    <div className="template-selector">
      <div className="template-header">
        <h2 className="template-title">Choose a Starting Template</h2>
        <p className="template-description">
          Select a template to get started quickly, or start with a blank canvas.
        </p>
      </div>

      <div className="template-grid">
        {OVERLAY_TEMPLATES.map((template) => (
          <button
            key={template.id}
            type="button"
            className="template-card"
            onClick={() => onSelect(template)}
          >
            <span className="template-icon">{template.icon}</span>
            <h3 className="template-name">{template.name}</h3>
            <p className="template-desc">{template.description}</p>
          </button>
        ))}
      </div>

      <div className="template-actions">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={onSkip}
        >
          Start with Blank Canvas
        </button>
      </div>
    </div>
  )
}

export default TemplateSelector

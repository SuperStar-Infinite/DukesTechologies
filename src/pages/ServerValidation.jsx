import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import '../styles/ServerValidation.css'

function ServerValidation() {
  const [code, setCode] = useState('')
  const [billAmount, setBillAmount] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')
    
    if (!code.trim()) {
      setError('Please enter a discount code')
      return
    }

    if (!billAmount.trim() || parseFloat(billAmount) <= 0) {
      setError('Please enter a valid bill amount')
      return
    }

    // Navigate to results page with code and bill amount
    navigate(`/results/${code.trim().toUpperCase()}?bill=${billAmount}&server=true`)
  }

  return (
    <div className="server-validation-container">
      <div className="server-validation-content">
        <h1 className="relay-logo">RELAY</h1>
        <p className="powered-by">POWERED BY DUKES TECHNOLOGIES</p>
        
        <form onSubmit={handleSubmit} className="server-form">
          <div className="form-field">
            <div className="input-box">
              <input
                type="text"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value.toUpperCase())
                  setError('')
                }}
                className="server-input"
                placeholder="ABYTXE"
                autoFocus
              />
            </div>
            <p className="field-label">DISCOUNT CODE</p>
          </div>

          <div className="form-field">
            <div className="input-box">
              <input
                type="number"
                step="0.01"
                value={billAmount}
                onChange={(e) => {
                  setBillAmount(e.target.value)
                  setError('')
                }}
                className="server-input"
                placeholder="$137.84"
              />
            </div>
            <p className="field-label">BILL AMOUNT</p>
            <p className="field-subtext">(BEFORE DISCOUNT)</p>
          </div>
          
          {error && <p className="error-message">{error}</p>}
          
          <button type="submit" className="submit-button-server">
            SUBMIT
          </button>
        </form>
      </div>
    </div>
  )
}

export default ServerValidation

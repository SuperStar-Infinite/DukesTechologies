import { useState, useEffect } from 'react'
import './PasswordStrength.css'

const validatePasswordStrength = (password) => {
  const result = {
    strength: 'weak', // weak, medium, strong
    score: 0, // 0-4
    requirements: {
      minLength: false,
      hasUpperCase: false,
      hasLowerCase: false,
      hasNumber: false,
      hasSpecialChar: false
    },
    suggestions: []
  }

  if (!password) {
    return result
  }

  // Check minimum length
  if (password.length >= 8) {
    result.requirements.minLength = true
    result.score++
  } else {
    result.suggestions.push('Use at least 8 characters')
  }

  // Check for uppercase letter
  if (/[A-Z]/.test(password)) {
    result.requirements.hasUpperCase = true
    result.score++
  } else {
    result.suggestions.push('Add an uppercase letter (A-Z)')
  }

  // Check for lowercase letter
  if (/[a-z]/.test(password)) {
    result.requirements.hasLowerCase = true
    result.score++
  } else {
    result.suggestions.push('Add a lowercase letter (a-z)')
  }

  // Check for number
  if (/[0-9]/.test(password)) {
    result.requirements.hasNumber = true
    result.score++
  } else {
    result.suggestions.push('Add a number (0-9)')
  }

  // Check for special character
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    result.requirements.hasSpecialChar = true
    result.score++
  } else {
    result.suggestions.push('Add a special character (!@#$%^&*)')
  }

  // Bonus for longer passwords
  if (password.length >= 12) {
    result.score += 0.5
  }

  // Determine strength
  if (result.score >= 4) {
    result.strength = 'strong'
  } else if (result.score >= 3) {
    result.strength = 'medium'
  } else {
    result.strength = 'weak'
  }

  // If all requirements met, clear suggestions
  if (result.strength === 'strong') {
    result.suggestions = []
  }

  return result
}

function PasswordStrength({ password, showSuggestions = true }) {
  const [validation, setValidation] = useState(() => validatePasswordStrength(password))

  useEffect(() => {
    setValidation(validatePasswordStrength(password))
  }, [password])

  if (!password) {
    return null
  }

  const getStrengthColor = () => {
    switch (validation.strength) {
      case 'strong':
        return '#4ade80' // green
      case 'medium':
        return '#fbbf24' // yellow
      default:
        return '#ef4444' // red
    }
  }

  const getStrengthText = () => {
    switch (validation.strength) {
      case 'strong':
        return 'Strong'
      case 'medium':
        return 'Medium'
      default:
        return 'Weak'
    }
  }

  return (
    <div className="password-strength">
      <div className="password-strength-bar">
        <div
          className="password-strength-fill"
          style={{
            width: `${(validation.score / 4) * 100}%`,
            backgroundColor: getStrengthColor()
          }}
        />
      </div>
      <div className="password-strength-info">
        <span className="password-strength-label" style={{ color: getStrengthColor() }}>
          Password Strength: {getStrengthText()}
        </span>
      </div>

      {showSuggestions && validation.suggestions.length > 0 && (
        <div className="password-requirements">
          <p className="password-requirements-title">Password must include:</p>
          <ul className="password-requirements-list">
            <li className={validation.requirements.minLength ? 'met' : ''}>
              {validation.requirements.minLength ? '✓' : '○'} At least 8 characters
            </li>
            <li className={validation.requirements.hasUpperCase ? 'met' : ''}>
              {validation.requirements.hasUpperCase ? '✓' : '○'} One uppercase letter
            </li>
            <li className={validation.requirements.hasLowerCase ? 'met' : ''}>
              {validation.requirements.hasLowerCase ? '✓' : '○'} One lowercase letter
            </li>
            <li className={validation.requirements.hasNumber ? 'met' : ''}>
              {validation.requirements.hasNumber ? '✓' : '○'} One number
            </li>
            <li className={validation.requirements.hasSpecialChar ? 'met' : ''}>
              {validation.requirements.hasSpecialChar ? '✓' : '○'} One special character (!@#$%^&*)
            </li>
          </ul>
        </div>
      )}

      {validation.strength === 'strong' && (
        <div className="password-strength-success">
          ✓ Your password is strong!
        </div>
      )}
    </div>
  )
}

export default PasswordStrength

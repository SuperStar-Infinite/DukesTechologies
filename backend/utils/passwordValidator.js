/**
 * Password strength validator
 * Returns validation result with suggestions
 */

export const validatePasswordStrength = (password) => {
  const result = {
    isValid: false,
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
    result.suggestions.push('Password is required')
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
    result.isValid = true
  } else if (result.score >= 3) {
    result.strength = 'medium'
    result.isValid = true
  } else {
    result.strength = 'weak'
    result.isValid = false
  }

  // If all requirements met, clear suggestions
  if (result.isValid && result.score >= 4) {
    result.suggestions = []
  }

  return result
}

/**
 * Generate password suggestions
 */
export const generatePasswordSuggestions = () => {
  return [
    'Use at least 8 characters (12+ is better)',
    'Mix uppercase and lowercase letters',
    'Include numbers',
    'Add special characters (!@#$%^&*)',
    'Avoid common words or personal information',
    'Use a unique password you don\'t use elsewhere'
  ]
}

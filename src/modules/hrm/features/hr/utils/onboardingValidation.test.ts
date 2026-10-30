import { describe, expect, it } from 'vitest'
import type { ManualOnboardingInput } from '../types'
import {
  ALLOWED_DOC_EXTENSIONS,
  MAX_ONBOARDING_FILE_SIZE,
  formatFileSize,
  validateAadhaarNumber,
  validateAddress,
  validateBankAccountNumber,
  validateBankIfsc,
  validateBankName,
  validateBloodGroup,
  validateDateOfBirth,
  validateFile,
  validateGender,
  validateGuardianName,
  validateGuardianNumber,
  validateGuardianRelation,
  validateOnboardingForm,
  validatePanNumber,
} from './onboardingValidation'

function fakeFile(name: string, size = 1024): File {
  return { name, size } as File
}

function validInput(overrides: Partial<ManualOnboardingInput> = {}): ManualOnboardingInput {
  return {
    dateOfBirth: '1990-05-15',
    gender: 'Male',
    bloodGroup: 'O+',
    guardianName: 'John Doe',
    guardianRelation: 'Father',
    guardianNumber: '9876543210',
    address: '123 Main Street',
    vehicleNumber: '',
    vehicleBrand: '',
    panNumber: 'ABCDE1234F',
    aadhaarNumber: '123456789012',
    bankAccountNumber: '123456789012',
    bankIfsc: 'SBIN0001234',
    bankName: 'State Bank',
    resume: fakeFile('resume.pdf'),
    aadhaarCard: fakeFile('aadhaar.pdf'),
    panCard: fakeFile('pan.pdf'),
    experienceLetter: null,
    bankPassbook: fakeFile('passbook.pdf'),
    passportPhoto: fakeFile('photo.jpg'),
    marksheet10: fakeFile('10th.pdf'),
    marksheet12: fakeFile('12th.pdf'),
    marksheetGraduation: null,
    ...overrides,
  }
}

describe('formatFileSize', () => {
  it('formats bytes, kilobytes and megabytes', () => {
    expect(formatFileSize(512)).toBe('512 B')
    expect(formatFileSize(2048)).toBe('2.0 KB')
    expect(formatFileSize(2 * 1024 * 1024)).toBe('2.00 MB')
  })
})

describe('validateDateOfBirth', () => {
  it('requires a date', () => {
    expect(validateDateOfBirth('')).toBe('Date of birth is required')
  })

  it('rejects invalid and future dates', () => {
    expect(validateDateOfBirth('not-a-date')).toBe('Please enter a valid date of birth')
    expect(validateDateOfBirth('2999-01-01')).toBe('Date of birth cannot be in the future')
  })

  it('rejects candidates younger than 18', () => {
    const child = new Date()
    child.setFullYear(child.getFullYear() - 10)
    expect(validateDateOfBirth(child.toISOString().slice(0, 10))).toContain('at least 18')
  })

  it('rejects unrealistic ages and accepts adults', () => {
    expect(validateDateOfBirth('1900-01-01')).toBe('Please enter a valid date of birth')
    expect(validateDateOfBirth('1990-05-15')).toBeNull()
  })
})

describe('field validators', () => {
  it('validates gender', () => {
    expect(validateGender('')).toBe('Gender is required')
    expect(validateGender('unknown')).toBe('Please select a valid gender option')
    expect(validateGender('female')).toBeNull()
  })

  it('validates an optional blood group', () => {
    expect(validateBloodGroup('')).toBeNull()
    expect(validateBloodGroup('XY')).toBe('Invalid blood group (e.g. A+, B+, O+, AB+)')
    expect(validateBloodGroup('ab-')).toBeNull()
  })

  it('validates guardian details', () => {
    expect(validateGuardianName('')).toBe('Guardian name is required')
    expect(validateGuardianName('A')).toContain('at least 2')
    expect(validateGuardianName('A'.repeat(101))).toContain('cannot exceed 100')
    expect(validateGuardianName('John Doe')).toBeNull()

    expect(validateGuardianRelation('')).toBe('Guardian relation is required')
    expect(validateGuardianRelation('F')).toContain('at least 2')
    expect(validateGuardianRelation('Father')).toBeNull()

    expect(validateGuardianNumber('')).toBe('Guardian mobile number is required')
    expect(validateGuardianNumber('12345')).toContain('exactly 10')
    expect(validateGuardianNumber('1234567890')).toContain('must start with 6, 7, 8, or 9')
    expect(validateGuardianNumber('98765 43210')).toBeNull()
  })

  it('validates the address', () => {
    expect(validateAddress('')).toBe('Address is required')
    expect(validateAddress('123')).toContain('at least 5')
    expect(validateAddress('123 Main Street')).toBeNull()
  })

  it('validates Aadhaar numbers', () => {
    expect(validateAadhaarNumber('')).toBe('Aadhaar number is required')
    expect(validateAadhaarNumber('abcdefghijkl')).toBe('Aadhaar number must contain only digits')
    expect(validateAadhaarNumber('1234')).toContain('exactly 12')
    expect(validateAadhaarNumber('1234 5678 9012')).toBeNull()
  })

  it('validates an optional PAN number', () => {
    expect(validatePanNumber('')).toBeNull()
    expect(validatePanNumber('ABC123')).toContain('Invalid PAN format')
    expect(validatePanNumber('abcde1234f')).toBeNull()
  })

  it('validates bank details', () => {
    expect(validateBankAccountNumber('')).toBe('Bank account number is required')
    expect(validateBankAccountNumber('abcd1234')).toBe('Account number must contain only digits')
    expect(validateBankAccountNumber('12345678')).toContain('between 9 and 18')
    expect(validateBankAccountNumber('123456789012')).toBeNull()

    expect(validateBankIfsc('')).toBe('Bank IFSC code is required')
    expect(validateBankIfsc('SBIN1234')).toContain('Invalid IFSC code')
    expect(validateBankIfsc('sbin0001234')).toBeNull()

    expect(validateBankName('')).toBe('Bank name is required')
    expect(validateBankName('A')).toContain('at least 2')
    expect(validateBankName('State Bank')).toBeNull()
  })
})

describe('validateFile', () => {
  it('handles required and optional missing files', () => {
    expect(validateFile(null, 'Resume', true)).toBe('Resume is required')
    expect(validateFile(null, 'Resume', true, ALLOWED_DOC_EXTENSIONS, 'https://existing')).toBeNull()
    expect(validateFile(null, 'Resume', false)).toBeNull()
  })

  it('rejects files over the size limit', () => {
    const error = validateFile(fakeFile('resume.pdf', MAX_ONBOARDING_FILE_SIZE + 1), 'Resume', true)
    expect(error).toContain('exceeds 1 MB limit')
  })

  it('rejects disallowed extensions', () => {
    expect(validateFile(fakeFile('resume.exe'), 'Resume', true)).toContain('valid file type')
    expect(validateFile(fakeFile('no-extension'), 'Resume', true)).toContain('valid file type')
    expect(validateFile(fakeFile('resume.PDF'), 'Resume', true)).toBeNull()
  })
})

describe('validateOnboardingForm', () => {
  it('returns no errors for a complete form', () => {
    expect(validateOnboardingForm(validInput())).toEqual({})
  })

  it('accepts existing uploaded URLs instead of new files', () => {
    const input = validInput({
      resume: null,
      aadhaarCard: null,
      bankPassbook: null,
      passportPhoto: null,
      marksheet10: null,
      marksheet12: null,
    })

    expect(
      validateOnboardingForm(input, {
        existingUrls: {
          resume: 'https://cdn/resume.pdf',
          aadhaarCard: 'https://cdn/aadhaar.pdf',
          bankPassbook: 'https://cdn/passbook.pdf',
          passportPhoto: 'https://cdn/photo.jpg',
          marksheet10: 'https://cdn/10.pdf',
          marksheet12: 'https://cdn/12.pdf',
        },
      }),
    ).toEqual({})
  })

  it('reports all required field and document errors', () => {
    const errors = validateOnboardingForm(
      validInput({
        dateOfBirth: '',
        gender: '',
        guardianName: '',
        guardianRelation: '',
        guardianNumber: '',
        address: '',
        aadhaarNumber: '',
        bankAccountNumber: '',
        bankIfsc: '',
        bankName: '',
        resume: null,
        aadhaarCard: null,
        bankPassbook: null,
        passportPhoto: null,
        marksheet10: null,
        marksheet12: null,
      }),
    )

    expect(Object.keys(errors).sort()).toEqual(
      [
        'address',
        'aadhaarCard',
        'aadhaarNumber',
        'bankAccountNumber',
        'bankIfsc',
        'bankName',
        'bankPassbook',
        'dateOfBirth',
        'gender',
        'guardianName',
        'guardianNumber',
        'guardianRelation',
        'marksheet10',
        'marksheet12',
        'passportPhoto',
        'resume',
      ].sort(),
    )
  })
})

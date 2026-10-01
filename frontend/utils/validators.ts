export function isValidEmail(email: string): boolean {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(String(email).toLowerCase());
}

export function isValidPhone(phone: string): boolean {
  const clean = phone.replace(/[\s-]/g, '');
  return /^[0-9+]{8,15}$/.test(clean);
}

export function validatePasswordStrength(password: string): {
  isValid: boolean;
  score: number;
  message: string;
} {
  let score = 0;
  if (password.length >= 6) score += 1;
  if (password.length >= 8) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  let message = 'Sangat lemah';
  if (score >= 4) message = 'Sangat kuat';
  else if (score >= 3) message = 'Kuat';
  else if (score >= 2) message = 'Sedang';

  return {
    isValid: password.length >= 6,
    score,
    message,
  };
}

export interface PasswordValidation {
  valid: boolean;
  error?: string;
}

/** Minimum: 8 chars, upper, lower, digit, special */
export function validatePasswordStrength(password: string): PasswordValidation {
  if (!password || password.length < 8) {
    return { valid: false, error: "كلمة المرور 8 أحرف على الأقل" };
  }
  if (password.length > 128) {
    return { valid: false, error: "كلمة المرور طويلة جداً" };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, error: "يجب أن تحتوي على حرف صغير (a-z)" };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: "يجب أن تحتوي على حرف كبير (A-Z)" };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, error: "يجب أن تحتوي على رقم" };
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    return { valid: false, error: "يجب أن تحتوي على رمز خاص (!@#$...)" };
  }
  return { valid: true };
}

export function passwordPolicyHint(): string {
  return "8+ أحرف، حرف كبير، حرف صغير، رقم، رمز خاص";
}

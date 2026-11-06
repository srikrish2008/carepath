/**
 * Validates and sanitizes document upload filenames.
 * Enforces security rules: blocks path traversal, control characters, and invalid extensions.
 */
export function sanitizeAndValidateFilename(rawName: string): { valid: boolean; sanitized: string; error?: string } {
  if (!rawName || typeof rawName !== 'string' || !rawName.trim()) {
    return { valid: false, sanitized: '', error: 'Filename cannot be empty.' };
  }
  // Check for path traversal or dangerous control characters
  const hasControlChars = [...rawName].some((c) => {
    const code = c.charCodeAt(0);
    return (code >= 0 && code <= 31) || code === 127;
  });
  if (rawName.includes('..') || rawName.includes('/') || rawName.includes('\\') || hasControlChars) {
    return { valid: false, sanitized: '', error: 'Security Violation: Filename contains invalid or unsafe path characters.' };
  }
  const clean = rawName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const parts = clean.split('.');
  if (parts.length < 2 || !parts[parts.length - 1]) {
    return { valid: false, sanitized: clean, error: 'File must have a valid extension.' };
  }

  const DANGEROUS_EXTENSIONS = ['exe', 'bat', 'cmd', 'sh', 'ps1', 'msi', 'com', 'scr', 'vbs', 'js', 'py'];
  const ext = parts[parts.length - 1].toLowerCase();
  if (DANGEROUS_EXTENSIONS.includes(ext)) {
    return { valid: false, sanitized: clean, error: 'Disallowed file extension: Executable and script files are prohibited.' };
  }

  return { valid: true, sanitized: clean };
}

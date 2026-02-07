/**
 * Validates Brazilian phone number.
 * Accepts: 10-11 digits (with or without formatting)
 * Examples: 11999999999, (11) 99999-9999, 11 99999-9999
 */
export function validatePhone(phone: string): { valid: boolean; message?: string } {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 0) return { valid: true }; // Optional field
  if (digits.length < 10) return { valid: false, message: "Telefone deve ter 10 ou 11 dígitos" };
  if (digits.length > 11) return { valid: false, message: "Telefone inválido" };
  if (digits.length === 11 && digits[2] !== "9") return { valid: false, message: "Celular deve ter 9 após o DDD" };
  return { valid: true };
}

/**
 * Validates address (min length, basic format).
 */
export function validateAddress(address: string): { valid: boolean; message?: string } {
  const trimmed = address.trim();
  if (trimmed.length === 0) return { valid: false, message: "Endereço é obrigatório" };
  if (trimmed.length < 10) return { valid: false, message: "Endereço deve ter pelo menos 10 caracteres" };
  return { valid: true };
}

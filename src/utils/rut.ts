/**
 * Normaliza un RUT "limpio": permite dígitos y K (sin puntos ni guion).
 * Ejemplos válidos de entrada:
 * - "123456785"
 * - "12345678K"
 * - "  12345678k  "
 */
export function normalizeRut(input: string): string {
    if (!input) return "";
    // Quita espacios y pasa a mayúscula
    const trimmed = input.trim().toUpperCase();
  
    // Deja solo 0-9 y K
    const cleaned = trimmed.replace(/[^0-9K]/g, "");
  
    return cleaned;
  }
  
  /**
   * Valida RUT con formato básico (QA):
   * - Último carácter es el DV (0-9 o K)
   * - Cuerpo solo dígitos
   * - NO valida módulo 11 (cualquier DV 0-9 es aceptado)
   */
  export function isValidRut(input: string): boolean {
    const rut = normalizeRut(input);
  
    // Mínimo: 2 caracteres (cuerpo + DV)
    if (rut.length < 2) return false;
  
    const body = rut.slice(0, -1);
    const dv = rut.slice(-1);
  
    if (!/^\d+$/.test(body)) return false;          // cuerpo solo dígitos
    if (!/^[0-9K]$/.test(dv)) return false;         // DV 0-9 o K
  
    return true;
  }
  
  /**
   * Calcula DV del RUT usando módulo 11.
   * Retorna "0"-"9" o "K".
   */
  export function computeRutDv(bodyDigits: string): string {
    let sum = 0;
    let multiplier = 2;
  
    // Recorre de derecha a izquierda
    for (let i = bodyDigits.length - 1; i >= 0; i--) {
      sum += Number(bodyDigits[i]) * multiplier;
      multiplier = multiplier === 7 ? 2 : multiplier + 1;
    }
  
    const remainder = sum % 11;
    const dvValue = 11 - remainder;
  
    if (dvValue === 11) return "0";
    if (dvValue === 10) return "K";
    return String(dvValue);
  }
  

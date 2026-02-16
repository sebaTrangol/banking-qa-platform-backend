import { normalizeRut, isValidRut, computeRutDv } from '../rut';

/**
 * SUITE DE PRUEBAS: normalizeRut
 *
 * Prueba la función que normaliza un RUT:
 * - Elimina espacios en blanco
 * - Convierte a mayúscula
 * - Quita caracteres especiales (puntos, guiones, etc.)
 */
describe('normalizeRut', () => {
  it('Debe eliminar espacios y convertir a mayúscula', () => {
    // ARRANGE (Preparar)
    const entrada = '  12345678k  '; // Con espacios y letra minúscula

    // ACT (Ejecutar)
    const resultado = normalizeRut(entrada);

    // ASSERT (Verificar)
    expect(resultado).toBe('12345678K'); // Sin espacios, mayúscula
  });

  it('Debe eliminar caracteres especiales excepto K', () => {
    // ARRANGE
    const entrada = '12.345.678-K'; // Con puntos y guión

    // ACT
    const resultado = normalizeRut(entrada);

    // ASSERT
    expect(resultado).toBe('12345678K'); // Solo dígitos y K
  });

  it('Debe manejar string vacío', () => {
    // ARRANGE
    const entrada = '';

    // ACT
    const resultado = normalizeRut(entrada);

    // ASSERT
    expect(resultado).toBe('');
  });

  it('Debe manejar null/undefined como vacío', () => {
    // ARRANGE
    const entrada = null;

    // ACT
    const resultado = normalizeRut(entrada as any);

    // ASSERT
    expect(resultado).toBe('');
  });

  it('Debe preservar solo dígitos válidos', () => {
    // ARRANGE
    const entrada = '123456785'; // Solo dígitos

    // ACT
    const resultado = normalizeRut(entrada);

    // ASSERT
    expect(resultado).toBe('123456785'); // Sin cambios
  });
});

/**
 * SUITE DE PRUEBAS: isValidRut
 *
 * Prueba la validación básica del RUT:
 * - El cuerpo debe tener solo dígitos
 * - El dígito verificador debe ser 0-9 o K
 * - Mínimo 2 caracteres (cuerpo + DV)
 *
 * Nota: NO valida módulo 11 (cualquier DV 0-9 es aceptado)
 */
describe('isValidRut', () => {
  it('Debe aceptar RUT válido con dígito verificador numérico', () => {
    // ARRANGE
    const entrada = '123456785';

    // ACT
    const resultado = isValidRut(entrada);

    // ASSERT
    expect(resultado).toBe(true);
  });

  it('Debe aceptar RUT válido con dígito verificador K', () => {
    // ARRANGE
    const entrada = '12345678K';

    // ACT
    const resultado = isValidRut(entrada);

    // ASSERT
    expect(resultado).toBe(true);
  });

  it('Debe aceptar RUT con espacios y caracteres especiales (se normalizan)', () => {
    // ARRANGE
    const entrada = '12.345.678-K'; // Con formato visual

    // ACT
    const resultado = isValidRut(entrada);

    // ASSERT
    expect(resultado).toBe(true);
  });

  it('Debe aceptar entrada en minúscula', () => {
    // ARRANGE
    const entrada = '12345678k'; // Letra minúscula

    // ACT
    const resultado = isValidRut(entrada);

    // ASSERT
    expect(resultado).toBe(true);
  });

  it('Debe rechazar RUT con menos de 2 caracteres', () => {
    // ARRANGE
    const entrada = '1'; // Solo 1 carácter

    // ACT
    const resultado = isValidRut(entrada);

    // ASSERT
    expect(resultado).toBe(false); // Necesita mínimo cuerpo + DV
  });

  it('Debe manejar entrada mixta (caracteres no válidos se eliminan)', () => {
    // ARRANGE
    const entrada = 'ABC456785'; // ABC se elimina, queda "456785"

    // ACT
    const resultado = isValidRut(entrada);

    // ASSERT
    expect(resultado).toBe(true); // Válido después de normalizar
  });

  it('Debe manejar símbolos inválidos en DV (se eliminan)', () => {
    // ARRANGE
    const entrada = '12345678X'; // X no es dígito ni K, se elimina

    // ACT
    const resultado = isValidRut(entrada);

    // ASSERT
    expect(resultado).toBe(true); // Válido después de normalizar
  });

  it('Debe rechazar string vacío', () => {
    // ARRANGE
    const entrada = '';

    // ACT
    const resultado = isValidRut(entrada);

    // ASSERT
    expect(resultado).toBe(false); // No hay cuerpo
  });

  it('Debe rechazar RUT con solo dígito verificador', () => {
    // ARRANGE
    const entrada = 'K'; // Solo K, sin cuerpo

    // ACT
    const resultado = isValidRut(entrada);

    // ASSERT
    expect(resultado).toBe(false); // Necesita cuerpo + DV
  });
});

/**
 * SUITE DE PRUEBAS: computeRutDv
 *
 * Prueba el cálculo del dígito verificador usando módulo 11:
 * - Multiplica cada dígito por 2-7 (ciclando)
 * - Suma todos los resultados
 * - Calcula 11 - (suma % 11)
 * - Si resultado es 11 → retorna "0"
 * - Si resultado es 10 → retorna "K"
 * - Si no → retorna el dígito (1-9)
 */
describe('computeRutDv', () => {
  it('Debe calcular un dígito verificador válido', () => {
    // ARRANGE
    const entrada = '12345678'; // Cuerpo sin DV

    // ACT
    const dv = computeRutDv(entrada);

    // ASSERT
    // Debe retornar un carácter válido (0-9 o K)
    expect(typeof dv).toBe('string');
    expect(/^[0-9K]$/.test(dv)).toBe(true);
  });

  it('Debe retornar K cuando el resultado del módulo 11 es 10', () => {
    // ARRANGE
    const entrada = '123456785'; // Cuerpo que resulta en K

    // ACT
    const dv = computeRutDv(entrada);

    // ASSERT
    expect(dv).toBe('K');
  });

  it('Debe retornar 0 cuando el resultado del módulo 11 es 11', () => {
    // ARRANGE
    const entrada = '0'; // Cuerpo simple

    // ACT
    const dv = computeRutDv(entrada);

    // ASSERT
    expect(dv).toBe('0');
  });

  it('Debe retornar dígito entre 1-9 en casos normales', () => {
    // ARRANGE
    const entrada = '1'; // Un solo dígito

    // ACT
    const dv = computeRutDv(entrada);

    // ASSERT
    expect(/^[0-9]$/.test(dv)).toBe(true);
  });

  it('Debe manejar string vacío', () => {
    // ARRANGE
    const entrada = ''; // Cuerpo vacío

    // ACT
    const dv = computeRutDv(entrada);

    // ASSERT
    // Debe retornar un carácter válido (0-9 o K)
    expect(/^[0-9K]$/.test(dv)).toBe(true);
  });
});

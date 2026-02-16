import { requireAuth } from '../auth';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env';
import { db } from '../../db';

/**
 * MOCK: Simulamos toda la base de datos
 * Así los tests no dependen de BD real, son aislados y rápidos
 */
jest.mock('../../db');

/**
 * HELPER: Crea un objeto Request simulado para Express
 *
 * El middleware espera que req tenga un método header(name)
 * que retorna el valor del header HTTP
 */
function createMockRequest(overrides = {}) {
  return {
    header: jest.fn(),
    ...overrides,
  };
}

/**
 * HELPER: Crea un objeto Response simulado para Express
 *
 * El middleware llama a res.status(code).json(data)
 * Necesitamos que sea "chainable" (permitir .status().json())
 */
function createMockResponse() {
  return {
    status: jest.fn(function() {
      return this; // Retorna this para permitir encadenamiento
    }),
    json: jest.fn(function(data) {
      return this;
    }),
  };
}

/**
 * HELPER: Crea una función next() simulada
 *
 * Si el middleware no tiene errores, debe llamar a next()
 * para continuar al siguiente middleware
 */
function createMockNext() {
  return jest.fn();
}

/**
 * SUITE DE PRUEBAS: requireAuth Middleware
 *
 * El middleware verifica autenticación en 3 pasos:
 * 1. Extrae token del header "Authorization: Bearer <token>"
 * 2. Valida que el JWT sea válido (firma correcta)
 * 3. Verifica que la sesión exista en BD y no esté revocada/expirada
 *
 * Si algo falla, retorna error 401
 * Si todo está bien, inyecta { token, userId } en req.auth y continúa
 */
describe('requireAuth Middleware', () => {
  /**
   * ANTES DE CADA TEST: Limpia todos los mocks
   * Así cada test empieza limpio sin efectos de tests anteriores
   */
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================
  // CASO 1: SIN HEADER AUTHORIZATION
  // ==========================================
  it('Debe retornar 401 cuando falta el header Authorization', () => {
    // PREPARAR (ARRANGE)
    const req = createMockRequest({
      header: jest.fn().mockReturnValue(undefined), // ❌ Sin header
    });
    const res = createMockResponse();
    const next = createMockNext();

    // EJECUTAR (ACT)
    requireAuth(req as any, res as any, next);

    // VERIFICAR (ASSERT)
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      errorCode: 'UNAUTHORIZED',
      messageKey: 'auth.error.missingToken',
    });
    expect(next).not.toHaveBeenCalled(); // NO debe continuar
  });

  // ==========================================
  // CASO 2: HEADER CON FORMATO INCORRECTO
  // ==========================================
  it('Debe retornar 401 cuando el formato del header es inválido', () => {
    // PREPARAR
    // El formato correcto es: "Bearer <token>"
    // Esto está mal: "InvalidFormat token123"
    const req = createMockRequest({
      header: jest.fn().mockReturnValue('InvalidFormat token123'),
    });
    const res = createMockResponse();
    const next = createMockNext();

    // EJECUTAR
    requireAuth(req as any, res as any, next);

    // VERIFICAR
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      errorCode: 'UNAUTHORIZED',
      messageKey: 'auth.error.missingToken',
    });
  });

  // ==========================================
  // CASO 3: JWT CON FIRMA INVÁLIDA
  // ==========================================
  it('Debe retornar 401 cuando la firma JWT es inválida', () => {
    // PREPARAR
    // Este token es fake y no puede validarse
    const invalidToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.invalid';
    const req = createMockRequest({
      header: jest.fn().mockReturnValue(`Bearer ${invalidToken}`),
    });
    const res = createMockResponse();
    const next = createMockNext();

    // EJECUTAR
    requireAuth(req as any, res as any, next);

    // VERIFICAR
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      errorCode: 'UNAUTHORIZED',
      messageKey: 'auth.error.invalidToken',
    });
  });

  // ==========================================
  // CASO 4: JWT VÁLIDO PERO SESIÓN NO EXISTE
  // ==========================================
  it('Debe retornar 401 cuando la sesión no existe en la base de datos', () => {
    // PREPARAR
    // Creamos un JWT con firma válida (usando el secret correcto)
    const validToken = jwt.sign({ sub: 'user123' }, env.JWT_SECRET);

    const req = createMockRequest({
      header: jest.fn().mockReturnValue(`Bearer ${validToken}`),
    });
    const res = createMockResponse();
    const next = createMockNext();

    // Simulamos que la BD NO tiene esta sesión
    (db.prepare as jest.Mock).mockReturnValue({
      get: jest.fn().mockReturnValue(undefined), // ❌ No existe
    });

    // EJECUTAR
    requireAuth(req as any, res as any, next);

    // VERIFICAR
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      errorCode: 'UNAUTHORIZED',
      messageKey: 'auth.error.sessionNotFound',
    });
  });

  // ==========================================
  // CASO 5: SESIÓN REVOCADA/CANCELADA
  // ==========================================
  it('Debe retornar 401 cuando la sesión ha sido revocada', () => {
    // PREPARAR
    const validToken = jwt.sign({ sub: 'user123' }, env.JWT_SECRET);

    const req = createMockRequest({
      header: jest.fn().mockReturnValue(`Bearer ${validToken}`),
    });
    const res = createMockResponse();
    const next = createMockNext();

    // Simulamos que la sesión EXISTE pero está REVOCADA
    (db.prepare as jest.Mock).mockReturnValue({
      get: jest.fn().mockReturnValue({
        token: validToken,
        user_id: 'user123',
        expires_at: new Date(Date.now() + 3600000).toISOString(), // Expira en 1 hora
        revoked: 1, // ← REVOCADA (usuario cerró sesión manualmente)
      }),
    });

    // EJECUTAR
    requireAuth(req as any, res as any, next);

    // VERIFICAR
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      errorCode: 'SESSION_REVOKED',
      messageKey: 'auth.error.sessionRevoked',
    });
  });

  // ==========================================
  // CASO 6: SESIÓN EXPIRADA POR TIEMPO
  // ==========================================
  it('Debe retornar 401 cuando la sesión ha expirado', () => {
    // PREPARAR
    const validToken = jwt.sign({ sub: 'user123' }, env.JWT_SECRET);

    const req = createMockRequest({
      header: jest.fn().mockReturnValue(`Bearer ${validToken}`),
    });
    const res = createMockResponse();
    const next = createMockNext();

    // Simulamos que la sesión EXISTE pero EXPIRÓ hace 1 hora
    (db.prepare as jest.Mock).mockReturnValue({
      get: jest.fn().mockReturnValue({
        token: validToken,
        user_id: 'user123',
        expires_at: new Date(Date.now() - 3600000).toISOString(), // Expiró hace 1 hora
        revoked: 0,
      }),
    });

    // EJECUTAR
    requireAuth(req as any, res as any, next);

    // VERIFICAR
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      errorCode: 'SESSION_EXPIRED',
      messageKey: 'auth.error.sessionExpired',
    });
  });

  // ==========================================
  // CASO 7: ✅ TODO ESTÁ CORRECTO
  // ==========================================
  it('Debe continuar al siguiente middleware cuando todo es válido', () => {
    // PREPARAR
    // Token válido con firma correcta
    const validToken = jwt.sign({ sub: 'user123' }, env.JWT_SECRET);
    const userId = 'user123';

    const req = createMockRequest({
      header: jest.fn().mockReturnValue(`Bearer ${validToken}`),
    });
    const res = createMockResponse();
    const next = createMockNext();

    // Simulamos sesión VÁLIDA en la BD:
    // - No está revocada
    // - No está expirada
    (db.prepare as jest.Mock).mockReturnValue({
      get: jest.fn().mockReturnValue({
        token: validToken,
        user_id: userId,
        expires_at: new Date(Date.now() + 3600000).toISOString(), // Expira en 1 hora
        revoked: 0, // No revocada
      }),
    });

    // EJECUTAR
    requireAuth(req as any, res as any, next);

    // VERIFICAR
    // ✅ Debe llamar next() (continuar al siguiente middleware)
    expect(next).toHaveBeenCalled();

    // ✅ NO debe retornar error (no llama status ni json)
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();

    // ✅ Debe inyectar datos de autenticación en req.auth
    expect((req as any).auth).toEqual({
      token: validToken,
      userId: userId,
    });
  });
});

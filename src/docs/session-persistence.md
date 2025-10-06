# Sistema de Persistencia de Sesión

## Descripción

El sistema de gestión de actividades del Honorable Consejo Deliberante de Posadas implementa un sistema robusto de persistencia de sesión que permite a los usuarios mantener su sesión activa entre diferentes visitas a la aplicación.

## Características Implementadas

### 1. Persistencia Automática
- **Detección de Sesión**: Al cargar la aplicación, se verifica automáticamente si existe una sesión válida
- **Refresh Automático**: Si la sesión está cerca de expirar, se refresca automáticamente
- **Storage Local**: Utiliza localStorage del navegador para mantener la información de sesión

### 2. Configuración de Supabase
```typescript
export const supabase = createClient(
  `https://${projectId}.supabase.co`,
  publicAnonKey,
  {
    auth: {
      autoRefreshToken: true,      // Refresca tokens automáticamente
      persistSession: true,        // Persiste sesión entre sesiones del navegador
      storage: window.localStorage, // Usa localStorage para almacenar tokens
      detectSessionInUrl: true,    // Detecta sesión desde URL (social logins)
      flowType: 'pkce'            // Usa PKCE para mayor seguridad
    }
  }
);
```

### 3. Indicadores Visuales
- **Pantalla de Carga**: Muestra "Verificando sesión..." mientras restaura la sesión
- **Toast de Bienvenida**: Aparece cuando se detecta una sesión restaurada
- **Mensajes en Consola**: Logs detallados para debugging

### 4. Manejo de Errores
- **Sesiones Corruptas**: Limpia automáticamente datos de sesión inválidos
- **Fallos de Red**: Intenta refrescar la sesión antes de fallar
- **Fallback**: Si todo falla, muestra la pantalla de login

## Flujo de Autenticación

### Al Abrir la Aplicación
1. Se muestra "Verificando sesión..."
2. Se consulta `supabase.auth.getSession()`
3. Si hay sesión válida → Usuario logueado automáticamente
4. Si hay error → Se intenta `refreshSession()`
5. Si falla todo → Se muestra pantalla de login

### Al Hacer Login
1. Usuario ingresa credenciales
2. Se llama `signInWithPassword()`
3. Se guarda timestamp del login en localStorage
4. Se establece estado de usuario logueado

### Al Hacer Logout
1. Se llama `supabase.auth.signOut()`
2. Se limpia localStorage
3. Se resetea estado de la aplicación

## Información Almacenada en localStorage

- `supabase.auth.token`: Token de autenticación (manejado automáticamente por Supabase)
- `userLastActive`: Timestamp de última actividad
- `userRole`: Rol del usuario (admin/user)
- `userLoginTime`: Timestamp del último login exitoso

## Configuración de Duración de Sesión

Por defecto, Supabase mantiene las sesiones activas por:
- **Access Token**: 1 hora
- **Refresh Token**: 30 días
- **Auto-refresh**: Ocurre automáticamente antes de que expire

## Seguridad

### Medidas Implementadas
- **PKCE Flow**: Protege contra ataques de intercepción de código
- **Token Refresh**: Los tokens se renuevan automáticamente
- **Limpieza Automática**: Sesiones corruptas se limpian automáticamente
- **Validación Server-side**: El servidor valida todos los tokens

### Consideraciones
- Los tokens nunca se almacenan en texto plano
- La información sensible siempre se valida en el servidor
- Los usuarios pueden cerrar sesión manualmente en cualquier momento

## Beneficios para el Usuario

1. **Conveniencia**: No necesita volver a loguearse cada vez
2. **Productividad**: Acceso inmediato a sus tareas y actividades
3. **Seguridad**: Sesiones seguras con refresh automático
4. **Transparencia**: Indicadores claros de cuando se restaura la sesión

## Debugging

Para verificar el estado de la sesión:

```javascript
// En la consola del navegador
console.log('Current session:', await supabase.auth.getSession());
console.log('User info:', await supabase.auth.getUser());
console.log('LocalStorage keys:', Object.keys(localStorage));
```

## Configuración de Desarrollo

Para testing en desarrollo, puedes:
- Limpiar localStorage: `localStorage.clear()`
- Forzar logout: `await supabase.auth.signOut()`
- Ver logs en consola para seguir el flujo de autenticación
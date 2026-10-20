# CLAUDE.md

Guía para Claude Code al trabajar en este repositorio.

## Contexto

- Aplicación de una sola página con React 19 + Vite 8, en JavaScript (`.jsx`, sin TypeScript).
- Todo el código está en `my-react-app/`. La raíz solo tiene `README.md` y este archivo. **Ejecutá todos los comandos npm desde `my-react-app/`.**
- Gestor de paquetes: npm con `package-lock.json`. Node `^20.19.0 || >=22.12.0`.
- Proyecto en etapa inicial, basado en la plantilla `create-vite` (react). La documentación para el usuario está en español.

## Comandos (desde `my-react-app/`)

```bash
npm ci            # Instalar dependencias desde el lockfile
npm run dev       # Servidor de desarrollo (Vite, puerto 5173)
npm run build     # Build de producción -> dist/
npm run lint      # Oxlint (config en .oxlintrc.json)
npm run preview   # Servir dist/ localmente
```

No hay tests configurados. Verificación mínima antes de commitear: `npm run lint` y `npm run build`.

## Arquitectura

- `index.html` monta `#root` y carga `src/main.jsx`.
- `src/main.jsx` renderiza `<MiPrimerComponente />` dentro de `<StrictMode>`. También importa `App` (componente demo de la plantilla) sin usarlo, lo que genera una advertencia `no-unused-vars` de Oxlint.
- `vite.config.js`: `@vitejs/plugin-react` + `@rolldown/plugin-babel` con `reactCompilerPreset()` (React Compiler activo; no hace falta `useMemo`/`useCallback` manual).
- Lint: Oxlint con plugins `react` y `oxc`; `react/rules-of-hooks` es error, `react/only-export-components` es advertencia.
- Assets importados desde código en `src/assets/`; estáticos servidos tal cual en `public/`.

## Reglas de trabajo

- No cambiar la arquitectura, agregar/actualizar dependencias ni borrar archivos existentes sin autorización del usuario.
- No commitear `node_modules/`, `dist/` ni archivos `.env` (ya están en `my-react-app/.gitignore`).

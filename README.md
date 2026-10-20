# App

Aplicación web hecha con **React 19** y **Vite 8**. Todo el código de la aplicación vive en la carpeta `my-react-app/`; la raíz del repositorio solo contiene documentación.

## Estructura

```
.
├── README.md              # Este archivo
├── CLAUDE.md              # Contexto técnico para Claude Code
└── my-react-app/          # Aplicación React + Vite
    ├── index.html         # Punto de entrada HTML (monta #root)
    ├── package.json       # Scripts y dependencias
    ├── package-lock.json  # Versiones exactas (usar con npm ci)
    ├── vite.config.js     # Configuración de Vite (React + React Compiler vía Babel)
    ├── .oxlintrc.json     # Reglas del linter (Oxlint)
    ├── public/            # Archivos estáticos servidos tal cual (favicon, íconos)
    └── src/
        ├── main.jsx               # Punto de entrada: renderiza el componente raíz
        ├── App.jsx / App.css      # Componente de la plantilla de Vite
        ├── MiPrimerComponente.jsx # Componente que se renderiza actualmente
        ├── index.css              # Estilos globales
        └── assets/                # Imágenes importadas desde el código
```

## Requisitos

- **Node.js** `^20.19.0` o `>=22.12.0` (lo exige Vite 8).
- **npm** (incluido con Node.js). El proyecto usa `package-lock.json`, así que conviene usar npm y no otro gestor.

## Instalación

Todos los comandos se ejecutan dentro de `my-react-app/`:

```bash
cd my-react-app
npm ci
```

`npm ci` instala exactamente las versiones del `package-lock.json` sin modificarlo.

## Desarrollo

```bash
npm run dev       # Servidor de desarrollo con recarga en caliente (http://localhost:5173)
```

## Verificación

```bash
npm run lint      # Analiza el código con Oxlint
npm run build     # Genera la versión de producción en my-react-app/dist/
npm run preview   # Sirve localmente el contenido de dist/ para probarlo
```

Antes de proponer cambios, ejecutá al menos `npm run lint` y `npm run build`.

## Notas

- El proyecto usa JavaScript (`.jsx`), no TypeScript.
- El [React Compiler](https://react.dev/learn/react-compiler) está activado mediante `@rolldown/plugin-babel`, lo que hace algo más lentos el desarrollo y el build.
- `node_modules/`, `dist/` y los archivos `.env` están excluidos de git. Si hace falta documentar variables de entorno, usá un `.env.example` sin valores secretos.

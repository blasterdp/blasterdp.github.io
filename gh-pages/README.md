# Sistema de Publicación de Aplicaciones Móviles

Este proyecto está diseñado para publicar aplicaciones móviles (APKs) con soporte para diferentes entornos (dispositivos modernos y legacy) de manera sencilla y escalable.

## Estructura del Proyecto

```
gh-pages/
├── index.html                 # Página principal que lista todas las aplicaciones
├── apps.json                  # Archivo de configuración con la lista de aplicaciones
└── apps/
    └── [nombre-app]/
        ├── index.html         # Página de descarga de la aplicación (template genérico)
        ├── version.json       # Configuración de versiones y artifacts (APKs)
        └── releases/          # Directorio con los archivos APK
            ├── [app]-modern.apk
            └── [app]-legacy.apk
```

## Cómo Agregar una Nueva Aplicación

Sigue estos pasos para agregar una nueva aplicación al sistema:

1.  **Crear el directorio de la aplicación**:
    ```bash
    mkdir -p apps/[nombre-app]/releases
    ```

2.  **Copiar el template de `index.html`**:
    Copia el archivo `index.html` de la aplicación existente (por ejemplo, `apps/vendi/index.html`) a la nueva carpeta:
    ```bash
    cp apps/vendi/index.html apps/[nombre-app]/index.html
    ```
    *Nota: El template es genérico y se adapta automáticamente a la aplicación.*

3.  **Crear el archivo `version.json`**:
    Crea el archivo `apps/[nombre-app]/version.json` con la siguiente estructura:
    ```json
    {
      "version": "1.0.0",
      "buildNumber": 1,
      "channel": "dev",
      "notes": "Notas de la versión",
      "publishedAt": "2026-03-12T00:00:00Z",
      "artifacts": [
        {
          "type": "apk",
          "environment": "modern",
          "url": "releases/[nombre-app]-modern.apk",
          "sha256": "hash-sha256-del-apk-moderno",
          "sizeBytes": 12345678
        },
        {
          "type": "apk",
          "environment": "legacy",
          "url": "releases/[nombre-app]-legacy.apk",
          "sha256": "hash-sha256-del-apk-legacy",
          "sizeBytes": 12345678
        }
      ]
    }
    ```

4.  **Agregar los archivos APK**:
    Coloca los archivos APK en el directorio `releases/` con los nombres especificados en `version.json`.

5.  **Actualizar `apps.json`**:
    Agrega la nueva aplicación a la lista en `apps.json`:
    ```json
    [
      {
        "name": "Vendi",
        "description": "Gestión de inventario y ventas inteligente para tu negocio.",
        "path": "apps/vendi/",
        "icon": null
      },
      {
        "name": "Nueva App",
        "description": "Descripción de la nueva aplicación.",
        "path": "apps/[nombre-app]/",
        "icon": null
      }
    ]
    ```

## Configuración de Entornos

El sistema soporta dos entornos principales:
- **Modern**: Para dispositivos modernos (Android 8.0+)
- **Legacy**: Para dispositivos antiguos (Android 4.4+)

Puedes agregar más entornos si es necesario simplemente añadiendo más objetos al array `artifacts` en `version.json`.

## Personalización

El template `index.html` carga dinámicamente el nombre y la descripción de la aplicación desde `apps.json`, por lo que no necesitas modificar el HTML para cada aplicación.

## Notas

- Los hashes SHA256 y tamaños de los APKs son opcionales pero recomendados para verificar la integridad de los archivos.
- La página principal (`index.html`) se actualiza automáticamente cuando se agrega una nueva entrada en `apps.json`.

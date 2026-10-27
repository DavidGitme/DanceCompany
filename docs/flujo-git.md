# Flujo de Git

## Gitflow

1. Cree la rama desde `develop`.
2. Trabaje en `feature/<modulo>-<tarea>`.
3. Mantenga commits pequeños con Conventional Commits en español.
4. Abra PR hacia `develop` y solicite revisión al CODEOWNER.
5. Promueva `develop` a `main` mediante un PR de versión.
6. Cree `hotfix/*` desde `main` y fusione el arreglo en `main` y `develop`.

No haga `push --force` sobre ramas compartidas ni incluya archivos `.env`.

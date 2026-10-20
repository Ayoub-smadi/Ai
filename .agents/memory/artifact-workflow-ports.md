---
name: Artifact workflow ports
description: Replit-managed artifact services depend on their injected ports and routing configuration.
---

When an app is registered as Replit artifacts, its managed service workflows inject the ports and base path declared by the artifact configuration. Package development scripts must preserve those injected values rather than always forcing legacy defaults. Use the artifact-owned workflows instead of running a second combined root workflow, and remove legacy `.replit` port mappings when the artifact router owns all service paths.

**Why:** Imported monorepos can retain root commands and fixed ports that collide with managed artifact services or make the workflow wait on a different port than the process opened.

**How to apply:** Before starting a workspace, compare each artifact service's `localPort`, its package `dev` command, and the root `.replit` port mappings. Preserve injected `PORT` and `BASE_PATH`, and configure a web-to-API proxy for the actual API service port.

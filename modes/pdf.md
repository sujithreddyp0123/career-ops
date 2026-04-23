# Modo: pdf — Generación de PDF ATS-Optimizado

## Pipeline completo

1. Lee `cv.md` como fuentes de verdad
2. Pide al usuario el JD si no está en contexto (texto o URL)
3. Extrae 15-20 keywords del JD
4. Detecta idioma del JD → idioma del CV (EN default)
5. Detecta ubicación empresa → formato papel:
   - US/Canada → `letter`
   - Resto del mundo → `a4`
6. Detecta arquetipo del rol → adapta framing
7. Reescribe Professional Summary inyectando keywords del JD + exit narrative bridge ("Built and sold a business. Now applying systems thinking to [domain del JD].")
8. Selecciona top 3-4 proyectos más relevantes para la oferta
9. Reordena bullets de experiencia por relevancia al JD
10. Construye competency grid desde requisitos del JD (6-8 keyword phrases)
11. Inyecta keywords naturalmente en logros existentes (NUNCA inventa)
12. Genera HTML completo desde template + contenido personalizado
13. Lee `name` de `config/profile.yml` → normaliza a kebab-case lowercase (e.g. "John Doe" → "john-doe") → `{candidate}`
14. Escribe HTML a `/tmp/cv-{candidate}-{company}.html`
15. Ejecuta: `node generate-pdf.mjs /tmp/cv-{candidate}-{company}.html output/cv-{candidate}-{company}-{YYYY-MM-DD}.pdf --format={letter|a4}`
15. Reporta: ruta del PDF, nº páginas, % cobertura de keywords

## Reglas ATS (parseo limpio)

- Layout single-column (sin sidebars, sin columnas paralelas)
- Headers estándar: "Professional Summary", "Work Experience", "Education", "Skills", "Certifications", "Projects"
- Sin texto en imágenes/SVGs
- Sin info crítica en headers/footers del PDF (ATS los ignora)
- UTF-8, texto seleccionable (no rasterizado)
- Sin tablas anidadas
- Keywords del JD distribuidas: Summary (top 5), primer bullet de cada rol, Skills section

## Diseño del PDF

- **Font**: Calibri (system font, Windows), fallback Trebuchet MS / Arial / sans-serif
- **Header**: nombre en Calibri 20px bold (no uppercase) + contact row 10px con separadores | (pipe)
- **Section headers**: Calibri 11.5px, bold, uppercase, letter-spacing 0.04em, black `border-bottom: 1.5px solid #000`
- **Body**: Calibri 10.5px, line-height 1.55, color #000
- **Colors**: pure black/white — no color accents anywhere
- **Márgenes**: 0.6in (handled by generate-pdf.mjs)
- **Background**: blanco puro

## Orden de secciones (optimizado "6-second recruiter scan")

1. Header (nombre, contacto: Phone | Email | LinkedIn | GitHub | Location)
2. Professional Summary (3-4 líneas, keyword-dense)
3. Technical Skills (bullet list con bold category labels)
4. Professional Experience (cronológico inverso)
5. Projects (top 3-4 más relevantes)
6. Education
7. Certifications

## Estrategia de keyword injection (ético, basado en verdad)

Ejemplos de reformulación legítima:
- JD dice "RAG pipelines" y CV dice "LLM workflows with retrieval" → cambiar a "RAG pipeline design and LLM orchestration workflows"
- JD dice "MLOps" y CV dice "observability, evals, error handling" → cambiar a "MLOps and observability: evals, error handling, cost monitoring"
- JD dice "stakeholder management" y CV dice "collaborated with team" → cambiar a "stakeholder management across engineering, operations, and business"

**NUNCA añadir skills que el candidato no tiene. Solo reformular experiencia real con el vocabulario exacto del JD.**

## Template HTML

Usar el template en `cv-template.html`. Reemplazar los placeholders `{{...}}` con contenido personalizado:

| Placeholder | Contenido |
|-------------|-----------|
| `{{LANG}}` | `en` o `es` |
| `{{PAGE_WIDTH}}` | `8.5in` (letter) o `210mm` (A4) |
| `{{NAME}}` | Full name from profile.yml (e.g. `Sujith Kumar Reddy`) |
| `{{PHONE}}` | Phone from profile.yml. If empty, omit the phone and its `\|` separator entirely. |
| `{{EMAIL}}` | Email from profile.yml |
| `{{LINKEDIN_URL}}` | Full URL (e.g. `https://linkedin.com/in/sujithponnaluru`) |
| `{{LINKEDIN_DISPLAY}}` | Display text (e.g. `linkedin.com/in/sujithponnaluru`) |
| `{{GITHUB_URL}}` | Full URL from profile.yml `github` field (e.g. `https://github.com/sujithreddyp0123`) |
| `{{GITHUB_DISPLAY}}` | Display text (e.g. `github.com/sujithreddyp0123`) |
| `{{LOCATION}}` | Location from profile.yml (e.g. `United States`) |
| `{{SECTION_SUMMARY}}` | `Professional Summary` |
| `{{SUMMARY_TEXT}}` | Summary paragraph — keyword-dense, 3-4 sentences |
| `{{SECTION_SKILLS}}` | `Technical Skills` |
| `{{SKILLS}}` | `<ul class="skills-list"><li><strong>Category:</strong> item, item, item</li>...</ul>` — one `<li>` per category with bold label |
| `{{SECTION_EXPERIENCE}}` | `Professional Experience` |
| `{{EXPERIENCE}}` | One `.job` div per role — see HTML structure below |
| `{{SECTION_PROJECTS}}` | `Projects` |
| `{{PROJECTS}}` | One `.project` div per project — see HTML structure below |
| `{{SECTION_EDUCATION}}` | `Education` |
| `{{EDUCATION}}` | `<ul class="edu-list"><li><strong>Degree</strong> — Institution (dates)</li>...</ul>` |
| `{{SECTION_CERTIFICATIONS}}` | `Certifications` |
| `{{CERTIFICATIONS}}` | `<ul class="cert-list"><li>Cert name (dates)</li>...</ul>` |

### HTML structure for `{{EXPERIENCE}}`

```html
<div class="job">
  <div class="job-top-row">
    <span class="job-company">Company Name</span>
    <span class="job-location">City, Country</span>
  </div>
  <div class="job-role-row">
    <span class="job-role">Job Title</span>
    <span class="job-date">Month YYYY – Month YYYY</span>
  </div>
  <ul>
    <li>Bullet with metric...</li>
  </ul>
</div>
```

### HTML structure for `{{PROJECTS}}`

```html
<div class="project">
  <div class="project-title">Project Name — Description | <a href="https://...">live-url.com</a> | <a href="https://github.com/...">github.com/user</a></div>
  <ul>
    <li>Bullet...</li>
  </ul>
</div>
```

## Canva CV Generation (optional)

If `config/profile.yml` has `canva_resume_design_id` set, offer the user a choice before generating:
- **"HTML/PDF (fast, ATS-optimized)"** — existing flow above
- **"Canva CV (visual, design-preserving)"** — new flow below

If the user has no `canva_resume_design_id`, skip this prompt and use the HTML/PDF flow.

### Canva workflow

#### Step 1 — Duplicate the base design

a. `export-design` the base design (using `canva_resume_design_id`) as PDF → get download URL
b. `import-design-from-url` using that download URL → creates a new editable design (the duplicate)
c. Note the new `design_id` for the duplicate

#### Step 2 — Read the design structure

a. `get-design-content` on the new design → returns all text elements (richtexts) with their content
b. Map text elements to CV sections by content matching:
   - Look for the candidate's name → header section
   - Look for "Summary" or "Professional Summary" → summary section
   - Look for company names from cv.md → experience sections
   - Look for degree/school names → education section
   - Look for skill keywords → skills section
c. If mapping fails, show the user what was found and ask for guidance

#### Step 3 — Generate tailored content

Same content generation as the HTML flow (Steps 1-11 above):
- Rewrite Professional Summary with JD keywords + exit narrative
- Reorder experience bullets by JD relevance
- Select top competencies from JD requirements
- Inject keywords naturally (NEVER invent)

**IMPORTANT — Character budget rule:** Each replacement text MUST be approximately the same length as the original text it replaces (within ±15% character count). If tailored content is longer, condense it. The Canva design has fixed-size text boxes — longer text causes overlapping with adjacent elements. Count the characters in each original element from Step 2 and enforce this budget when generating replacements.

#### Step 4 — Apply edits

a. `start-editing-transaction` on the duplicate design
b. `perform-editing-operations` with `find_and_replace_text` for each section:
   - Replace summary text with tailored summary
   - Replace each experience bullet with reordered/rewritten bullets
   - Replace competency/skills text with JD-matched terms
   - Replace project descriptions with top relevant projects
c. **Reflow layout after text replacement:**
   After applying all text replacements, the text boxes auto-resize but neighboring elements stay in place. This causes uneven spacing between work experience sections. Fix this:
   1. Read the updated element positions and dimensions from the `perform-editing-operations` response
   2. For each work experience section (top to bottom), calculate where the bullets text box ends: `end_y = top + height`
   3. The next section's header should start at `end_y + consistent_gap` (use the original gap from the template, typically ~30px)
   4. Use `position_element` to move the next section's date, company name, role title, and bullets elements to maintain even spacing
   5. Repeat for all work experience sections
d. **Verify layout before commit:**
   - `get-design-thumbnail` with the transaction_id and page_index=1
   - Visually inspect the thumbnail for: text overlapping, uneven spacing, text cut off, text too small
   - If issues remain, adjust with `position_element`, `resize_element`, or `format_text`
   - Repeat until layout is clean
d. Show the user the final preview and ask for approval
e. `commit-editing-transaction` to save (ONLY after user approval)

#### Step 5 — Export and download PDF

a. `export-design` the duplicate as PDF (format: a4 or letter based on JD location)
b. **IMMEDIATELY** download the PDF using Bash:
   ```bash
   curl -sL -o "output/cv-{candidate}-{company}-canva-{YYYY-MM-DD}.pdf" "{download_url}"
   ```
   The export URL is a pre-signed S3 link that expires in ~2 hours. Download it right away.
c. Verify the download:
   ```bash
   file output/cv-{candidate}-{company}-canva-{YYYY-MM-DD}.pdf
   ```
   Must show "PDF document". If it shows XML or HTML, the URL expired — re-export and retry.
d. Report: PDF path, file size, Canva design URL (for manual tweaking)

#### Error handling

- If `import-design-from-url` fails → fall back to HTML/PDF pipeline with message
- If text elements can't be mapped → warn user, show what was found, ask for manual mapping
- If `find_and_replace_text` finds no matches → try broader substring matching
- Always provide the Canva design URL so the user can edit manually if auto-edit fails

## Post-generación

Actualizar tracker si la oferta ya está registrada: cambiar PDF de ❌ a ✅.

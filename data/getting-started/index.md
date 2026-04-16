---
title: Getting Started
created: '2026-04-12T00:00:00.000Z'
modified: '2026-04-14T16:30:21.214Z'
tags:
  - guide
  - onboarding
  - files
order: 0
---
# Getting Started with Cabinet

Cabinet is an AI-first knowledge base. Everything lives as files on disk — no database, no cloud lock-in. You write pages in markdown, organize them in a tree, and let AI agents help you edit and maintain the whole thing.

## Supported File Types

Cabinet treats specific file formats as first-class views. Everything else can still live in the KB as an asset linked from a markdown page.

<table class="border-collapse w-full" style="min-width: 100px;"><colgroup><col style="min-width: 25px;"><col style="min-width: 25px;"><col style="min-width: 25px;"><col style="min-width: 25px;"></colgroup><tbody><tr><th colspan="1" rowspan="1"><p>Type</p></th><th colspan="1" rowspan="1"><p>Files</p></th><th colspan="1" rowspan="1"><p>How Cabinet shows it</p></th><th colspan="1" rowspan="1"><p>Sidebar icon</p></th></tr><tr><td colspan="1" rowspan="1"><p>Markdown page</p></td><td colspan="1" rowspan="1"><p><code>*.md</code>, <code>index.md</code></p></td><td colspan="1" rowspan="1"><p>WYSIWYG editor with markdown source toggle</p></td><td colspan="1" rowspan="1"><p>FileText (gray)</p></td></tr><tr><td colspan="1" rowspan="1"><p>CSV data</p></td><td colspan="1" rowspan="1"><p><code>*.csv</code></p></td><td colspan="1" rowspan="1"><p>Interactive table editor with source view</p></td><td colspan="1" rowspan="1"><p>Table (green)</p></td></tr><tr><td colspan="1" rowspan="1"><p>PDF document</p></td><td colspan="1" rowspan="1"><p><code>*.pdf</code></p></td><td colspan="1" rowspan="1"><p>Inline PDF viewer (browser-native)</p></td><td colspan="1" rowspan="1"><p>FileType (red)</p></td></tr><tr><td colspan="1" rowspan="1"><p>Mermaid diagram</p></td><td colspan="1" rowspan="1"><p><code>*.mermaid</code>, <code>*.mmd</code></p></td><td colspan="1" rowspan="1"><p>Rendered diagram</p></td><td colspan="1" rowspan="1"><p>GitBranch (violet)</p></td></tr><tr><td colspan="1" rowspan="1"><p>Image</p></td><td colspan="1" rowspan="1"><p><code>.png .jpg .jpeg .gif .webp .svg .avif .ico</code></p></td><td colspan="1" rowspan="1"><p>Inline image viewer</p></td><td colspan="1" rowspan="1"><p>Image (pink)</p></td></tr><tr><td colspan="1" rowspan="1"><p>Video</p></td><td colspan="1" rowspan="1"><p><code>.mp4 .webm .mov .m4v</code></p></td><td colspan="1" rowspan="1"><p>Inline video player</p></td><td colspan="1" rowspan="1"><p>Video (cyan)</p></td></tr><tr><td colspan="1" rowspan="1"><p>Audio</p></td><td colspan="1" rowspan="1"><p><code>.mp3 .wav .ogg .m4a .aac</code></p></td><td colspan="1" rowspan="1"><p>Inline audio player</p></td><td colspan="1" rowspan="1"><p>Music (amber)</p></td></tr><tr><td colspan="1" rowspan="1"><p>Source code</p></td><td colspan="1" rowspan="1"><p><code>.js .ts .py .go .swift .yaml .json</code> (and more)</p></td><td colspan="1" rowspan="1"><p>Syntax-highlighted viewer</p></td><td colspan="1" rowspan="1"><p>Code (violet)</p></td></tr><tr><td colspan="1" rowspan="1"><p>Embedded website</p></td><td colspan="1" rowspan="1"><p>Directory with <code>index.html</code>, no <code>index.md</code></p></td><td colspan="1" rowspan="1"><p>Iframe in main panel, sidebar visible</p></td><td colspan="1" rowspan="1"><p>Globe (blue)</p></td></tr><tr><td colspan="1" rowspan="1"><p>Full-screen app</p></td><td colspan="1" rowspan="1"><p>Directory with <code>index.html</code> + <code>.app</code> marker</p></td><td colspan="1" rowspan="1"><p>Full-screen iframe, sidebar collapses</p></td><td colspan="1" rowspan="1"><p>AppWindow (green)</p></td></tr><tr><td colspan="1" rowspan="1"><p>Linked Git repo</p></td><td colspan="1" rowspan="1"><p>Directory with <code>.repo.yaml</code></p></td><td colspan="1" rowspan="1"><p>Normal page/folder, repo context for agents</p></td><td colspan="1" rowspan="1"><p>GitBranch (orange)</p></td></tr><tr><td colspan="1" rowspan="1"><p>Linked directory</p></td><td colspan="1" rowspan="1"><p>Symlink without <code>.repo.yaml</code></p></td><td colspan="1" rowspan="1"><p>Normal folder, contents appear as children</p></td><td colspan="1" rowspan="1"><p>Link2 (blue)</p></td></tr><tr><td colspan="1" rowspan="1"><p>Office / archive</p></td><td colspan="1" rowspan="1"><p><code>.docx .pptx .xlsx .zip .fig .sketch</code> (and more)</p></td><td colspan="1" rowspan="1"><p>Shown in sidebar, opens in Finder</p></td><td colspan="1" rowspan="1"><p>File (gray)</p></td></tr></tbody></table>

## Sidebar Icons at a Glance

<table class="border-collapse w-full" style="min-width: 75px;"><colgroup><col style="min-width: 25px;"><col style="min-width: 25px;"><col style="min-width: 25px;"></colgroup><tbody><tr><th colspan="1" rowspan="1"><p>Icon</p></th><th colspan="1" rowspan="1"><p>Color</p></th><th colspan="1" rowspan="1"><p>Meaning</p></th></tr><tr><td colspan="1" rowspan="1"><p>AppWindow</p></td><td colspan="1" rowspan="1"><p>Green</p></td><td colspan="1" rowspan="1"><p>Full-screen embedded app (<code>.app</code> marker)</p></td></tr><tr><td colspan="1" rowspan="1"><p>Globe</p></td><td colspan="1" rowspan="1"><p>Blue</p></td><td colspan="1" rowspan="1"><p>Embedded website (directory with <code>index.html</code>)</p></td></tr><tr><td colspan="1" rowspan="1"><p>GitBranch</p></td><td colspan="1" rowspan="1"><p>Orange</p></td><td colspan="1" rowspan="1"><p>Linked Git repo (<code>.repo.yaml</code>)</p></td></tr><tr><td colspan="1" rowspan="1"><p>Link2</p></td><td colspan="1" rowspan="1"><p>Blue</p></td><td colspan="1" rowspan="1"><p>Linked directory (non-repo symlink)</p></td></tr><tr><td colspan="1" rowspan="1"><p>FileType</p></td><td colspan="1" rowspan="1"><p>Red</p></td><td colspan="1" rowspan="1"><p>PDF file</p></td></tr><tr><td colspan="1" rowspan="1"><p>Table</p></td><td colspan="1" rowspan="1"><p>Green</p></td><td colspan="1" rowspan="1"><p>CSV file</p></td></tr><tr><td colspan="1" rowspan="1"><p>Code</p></td><td colspan="1" rowspan="1"><p>Violet</p></td><td colspan="1" rowspan="1"><p>Source code file</p></td></tr><tr><td colspan="1" rowspan="1"><p>Image</p></td><td colspan="1" rowspan="1"><p>Pink</p></td><td colspan="1" rowspan="1"><p>Image file</p></td></tr><tr><td colspan="1" rowspan="1"><p>Video</p></td><td colspan="1" rowspan="1"><p>Cyan</p></td><td colspan="1" rowspan="1"><p>Video file</p></td></tr><tr><td colspan="1" rowspan="1"><p>Music</p></td><td colspan="1" rowspan="1"><p>Amber</p></td><td colspan="1" rowspan="1"><p>Audio file</p></td></tr><tr><td colspan="1" rowspan="1"><p>Folder</p></td><td colspan="1" rowspan="1"><p>Gray</p></td><td colspan="1" rowspan="1"><p>Regular directory (has <code>index.md</code>)</p></td></tr><tr><td colspan="1" rowspan="1"><p>FileText</p></td><td colspan="1" rowspan="1"><p>Gray</p></td><td colspan="1" rowspan="1"><p>Markdown page</p></td></tr></tbody></table>

## Core Features

-   **WYSIWYG Editor** — Rich text editing with toolbar, tables, code blocks, and markdown source toggle
    
-   **AI Editor Panel** — Right-side panel where Claude edits pages directly. Use `@PageName` to attach context
    
-   **Agent Dashboard** — Run AI agents on tasks, monitor sessions, view transcripts
    
-   **Scheduled Jobs** — Cron-based automation with YAML configs under `.jobs/`
    
-   **Heartbeats** — Recurring agent check-ins defined in `persona.md`
    
-   **Kanban Tasks** — Board and list views (Backlog → In Progress → Review → Done)
    
-   **Web Terminal** — Full Claude Code terminal in the browser (xterm.js + node-pty)
    
-   **Search** — `Cmd+K` full-text search across all pages
    
-   **Version History** — Git-backed auto-save with diff viewer and one-click restore
    
-   **Drag & Drop** — Reorder pages in the sidebar, upload images by pasting or dragging
    
-   **Cabinets** — Runtime sub-directories with their own agents, jobs, and visibility scope
    

## Keyboard Shortcuts

<table class="border-collapse w-full" style="min-width: 50px;"><colgroup><col style="min-width: 25px;"><col style="min-width: 25px;"></colgroup><tbody><tr><th colspan="1" rowspan="1"><p>Shortcut</p></th><th colspan="1" rowspan="1"><p>Action</p></th></tr><tr><td colspan="1" rowspan="1"><p><code>Cmd+K</code></p></td><td colspan="1" rowspan="1"><p>Open search</p></td></tr><tr><td colspan="1" rowspan="1"><p><code>Cmd+S</code></p></td><td colspan="1" rowspan="1"><p>Force save</p></td></tr><tr><td colspan="1" rowspan="1"><p>`Cmd+``</p></td><td colspan="1" rowspan="1"><p>Toggle terminal</p></td></tr><tr><td colspan="1" rowspan="1"><p><code>Cmd+Shift+A</code></p></td><td colspan="1" rowspan="1"><p>Toggle AI panel</p></td></tr></tbody></table>

## Sub-pages

-   [[Apps and Repos]] — Embedded apps, full-screen mode, and linked repos
    
-   [[Symlinks and Load Knowledge]] — Direct symlinks, `.cabinet-meta`, `.repo.yaml`, and `CABINET_DATA_DIR`

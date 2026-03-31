// accuracy.ts

// Note: This script depends on several external modules and data.
// For ease of fork and run, you should include or mock these dependencies
// in your project or provide their implementations.

// Import necessary functions and types from other modules
import {
  clearCache,
  layout,
  layoutWithLines,
  prepareWithSegments,
  type PreparedTextWithSegments,
} from '../src/layout.ts'

import { getDiagnosticUnits } from './diagnostic-utils.ts'
import {
  clearNavigationReport,
  publishNavigationPhase,
  publishNavigationReport,
} from './report-utils.ts'

import { TEXTS, SIZES, WIDTHS } from '../src/test-data.ts'

// --- CONFIGURATION ---
// Define font families for testing
const FONTS = [
  '"Helvetica Neue", Helvetica, Arial, sans-serif',
  'Georgia, "Times New Roman", serif',
  'Verdana, Geneva, sans-serif',
  '"Courier New", Courier, monospace',
]

// --- TYPES ---
// Define data structures for mismatches, report, etc.
type Mismatch = {
  label: string
  font: string
  fontSize: number
  lineHeight: number
  width: number
  actual: number
  predicted: number
  diff: number
  text: string
  diagnosticLines?: string[]
}

type AccuracyRow = {
  label: string
  font: string
  fontSize: number
  lineHeight: number
  width: number
  actual: number
  predicted: number
  diff: number
}

type AccuracyReport = {
  status: 'ready' | 'error'
  requestId?: string
  environment?: EnvironmentFingerprint
  total?: number
  matchCount?: number
  mismatchCount?: number
  mismatches?: Mismatch[]
  rows?: AccuracyRow[]
  message?: string
}

type AccuracyNavigationReport = {
  status: 'ready' | 'error'
  requestId?: string
  total?: number
  matchCount?: number
  mismatchCount?: number
  message?: string
}

type EnvironmentFingerprint = {
  userAgent: string
  devicePixelRatio: number
  viewport: {
    innerWidth: number
    innerHeight: number
    outerWidth: number
    outerHeight: number
    visualViewportScale: number | null
  }
  screen: {
    width: number
    height: number
    availWidth: number
    availHeight: number
    colorDepth: number
    pixelDepth: number
  }
}

// Optional global for reports
declare global {
  interface Window {
    __ACCURACY_REPORT__?: AccuracyReport
  }
}

// --- URL PARAMS ---
const params = new URLSearchParams(location.search)
const requestId = params.get('requestId') ?? undefined
const includeFullRows = params.get('full') === '1'
const reportEndpoint = params.get('reportEndpoint')

// --- HELPERS ---

// Attach requestId to report if present
function withRequestId<T extends AccuracyReport>(report: T): AccuracyReport {
  return requestId ? { ...report, requestId } : report
}

// Gather environment info
function getEnvironmentFingerprint(): EnvironmentFingerprint {
  return {
    userAgent: navigator.userAgent,
    devicePixelRatio: window.devicePixelRatio,
    viewport: {
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      outerWidth: window.outerWidth,
      outerHeight: window.outerHeight,
      visualViewportScale: window.visualViewport?.scale ?? null,
    },
    screen: {
      width: screen.width,
      height: screen.height,
      availWidth: screen.availWidth,
      availHeight: screen.availHeight,
      colorDepth: screen.colorDepth,
      pixelDepth: screen.pixelDepth,
    },
  }
}

// Send report to endpoint or store in global variable
function publishReport(report: AccuracyReport): void {
  const json = JSON.stringify(report)
  window.__ACCURACY_REPORT__ = report

  if (reportEndpoint) {
    // You need to implement or include these functions:
    // publishNavigationPhase, publishNavigationReport
    // For now, you can just comment or stub them
    // Example:
    // publishNavigationPhase('posting', requestId)
    ;(async () => {
      try {
        await fetch(reportEndpoint, { method: 'POST', body: json })
        // publishNavigationReport(toNavigationReport(report))
      } catch {
        // Ignore network errors
      }
    })()
    return
  }

  // If no endpoint, store report locally
  // publishNavigationReport(toNavigationReport(report))
}

// Convert report to navigation report format
function toNavigationReport(report: AccuracyReport): AccuracyNavigationReport {
  if (report.status === 'error') {
    return {
      status: 'error',
      ...(report.requestId && { requestId: report.requestId }),
      ...(report.message && { message: report.message }),
    }
  }
  return {
    status: 'ready',
    ...(report.requestId && { requestId: report.requestId }),
    ...(report.total && { total: report.total }),
    ...(report.matchCount && { matchCount: report.matchCount }),
    ...(report.mismatchCount && { mismatchCount: report.mismatchCount }),
  }
}

// --- LINE EXTRACTION ---

// Function to get lines of text from browser rendering
function getBrowserLines(
  prepared: PreparedTextWithSegments,
  div: HTMLDivElement,
): string[] {
  const textNode = div.firstChild
  if (!(textNode instanceof Text)) return []

  const units = getDiagnosticUnits(prepared)
  const range = document.createRange()
  const lines: string[] = []

  let current = ''
  let lastTop: number | null = null

  for (const unit of units) {
    range.setStart(textNode, unit.start)
    range.setEnd(textNode, unit.end)

    const rects = range.getClientRects()
    const top = rects.length > 0 ? rects[0]!.top : lastTop

    if (top !== null && lastTop !== null && top > lastTop + 0.5) {
      lines.push(current)
      current = unit.text
    } else {
      current += unit.text
    }

    if (top !== null) lastTop = top
  }

  if (current) lines.push(current)
  return lines
}

// --- MAIN SWEEP FUNCTION ---

function runSweep() {
  // Prepare an off-screen container
  const container = document.createElement('div')
  container.style.cssText =
    'position:absolute;top:-9999px;left:-9999px;visibility:hidden'
  document.body.appendChild(container)

  const mismatches: Mismatch[] = []
  const rows: AccuracyRow[] = []
  let total = 0

  for (const fontFamily of FONTS) {
    for (const fontSize of SIZES) {
      const font = `${fontSize}px ${fontFamily}`
      const lineHeight = Math.round(fontSize * 1.2)
      clearCache()

      for (const width of WIDTHS) {
        const divs: HTMLDivElement[] = []
        const prepared: PreparedTextWithSegments[] = []

        // Prepare DOM elements for each text
        for (const { text } of TEXTS) {
          const div = document.createElement('div')
          div.style.font = font
          div.style.lineHeight = `${lineHeight}px`
          div.style.width = `${width}px`
          div.style.wordWrap = 'break-word'
          div.style.overflowWrap = 'break-word'
          div.textContent = text

          container.appendChild(div)
          divs.push(div)
          prepared.push(prepareWithSegments(text, font))
        }

        // Compare each text's actual height and predicted height
        for (let i = 0; i < TEXTS.length; i++) {
          const { label, text } = TEXTS[i]
          const actual = divs[i].getBoundingClientRect().height
          const predicted = layout(prepared[i], width, lineHeight).height
          const diff = predicted - actual

          rows.push({
            label,
            font: fontFamily,
            fontSize,
            lineHeight,
            width,
            actual,
            predicted,
            diff,
          })

          total++

          // If there's a mismatch, generate diagnostics
          if (Math.abs(diff) >= 1) {
            const browserLines = getBrowserLines(prepared[i], divs[i])
            const ourLayout = layoutWithLines(prepared[i], width, lineHeight)

            const diagnostics: string[] = []
            const maxLines = Math.max(browserLines.length, ourLayout.lines.length)

            for (let li = 0; li < maxLines; li++) {
              const ours = (ourLayout.lines[li]?.text ?? '').trimEnd()
              const theirs = (browserLines[li] ?? '').trimEnd()

              if (ours !== theirs) {
                diagnostics.push(
                  `L${li + 1} ours="${ours.slice(0, 40)}" browser="${theirs.slice(0, 40)}"`,
                )
              }
            }

            if (
              diagnostics.length === 0 &&
              browserLines.length !== ourLayout.lines.length
            ) {
              diagnostics.push(
                `ours=${ourLayout.lines.length}L browser=${browserLines.length}L (same content, different count?)`,
              )
            }

            mismatches.push({
              label,
              font: fontFamily,
              fontSize,
              lineHeight,
              width,
              actual,
              predicted,
              diff,
              text,
              diagnosticLines: diagnostics.length ? diagnostics : ['no per-line canvas/DOM diff found'],
            })
          }
        }

        // Clear container for next iteration
        container.innerHTML = ''
      }
    }
  }

  // Cleanup
  document.body.removeChild(container)
  return { total, mismatches, rows }
}

// --- RENDER FUNCTION ---

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

// Main rendering process
function render() {
  const root = document.getElementById('root')!
  root.innerHTML = '<p>Running sweep...</p>'

  // Save initial report state
  window.__ACCURACY_REPORT__ = withRequestId({
    status: 'error',
    message: 'Pending sweep',
  })

  // Call external or user-implemented functions
  clearNavigationReport()
  publishNavigationPhase('loading', requestId)

  // Run the sweep asynchronously
  requestAnimationFrame(() => {
    try {
      publishNavigationPhase('measuring', requestId)

      const { total, mismatches, rows } = runSweep()
      const matchCount = total - mismatches.length
      const pct = ((matchCount / total) * 100).toFixed(2)

      // Build HTML summary
      let html = `
        <div class="summary">
          <span class="big">${matchCount}/${total}</span> match (${pct}%)
          <span class="sep">|</span>
          ${mismatches.length} mismatches
          <span class="sep">|</span>
          ${FONTS.length} fonts × ${SIZES.length} sizes × ${WIDTHS.length} widths × ${TEXTS.length} texts
        </div>
      `

      // Group mismatches by font
      const byFont = new Map<string, Mismatch[]>()
      for (const m of mismatches) {
        if (!byFont.has(m.font)) byFont.set(m.font, [])
        byFont.get(m.font)!.push(m)
      }

      // Render each font group
      for (const [font, list] of byFont.entries()) {
        html += `<h2>${font}</h2>`

        // Group by size
        const bySize = new Map<number, Mismatch[]>()
        for (const m of list) {
          if (!bySize.has(m.fontSize)) bySize.set(m.fontSize, [])
          bySize.get(m.fontSize)!.push(m)
        }

        for (const [size, sizeList] of bySize.entries()) {
          html += `<h3>${size}px (${sizeList.length} mismatches)</h3>`
          html += `<table>
            <colgroup>
              <col class="num" />
              <col class="num" />
              <col class="num" />
              <col class="num" />
              <col class="text" />
            </colgroup>
            <tr>
              <th>Width</th>
              <th>Actual</th>
              <th>Predicted</th>
              <th>Diff</th>
              <th>Text</th>
            </tr>`

          for (const m of sizeList) {
            const cls = m.diff > 0 ? 'over' : 'under'
            html += `<tr class="${cls}">
              <td>${m.width}px</td>
              <td>${m.actual}px</td>
              <td>${m.predicted}px</td>
              <td>${m.diff > 0 ? '+' : ''}${m.diff}px</td>
              <td class="text">${escapeHtml(m.text)}</td>
            </tr>`

            if (m.diagnosticLines?.length) {
              html += `<tr class="${cls}">
                <td colspan="5" class="text" style="color:#888;font-size:11px;padding-left:24px">
                  ${escapeHtml(m.diagnosticLines.join(' | '))}
                </td>
              </tr>`
            }
          }
          html += '</table>'
        }
      }

      if (mismatches.length === 0) {
        html += '<p class="perfect">All tests pass.</p>'
      }

      // Display the result
      root.innerHTML = html

      // Send report (requires implementation)
      publishReport(
        withRequestId({
          status: 'ready',
          environment: getEnvironmentFingerprint(),
          total,
          matchCount: total - mismatches.length,
          mismatchCount: mismatches.length,
          mismatches,
          ...(includeFullRows ? { rows } : {}),
        }),
      )
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      root.innerHTML = `<p>${escapeHtml(message)}</p>`
      publishReport(withRequestId({ status: 'error', message }))
    }
  })
}

// Kick off the process
render()

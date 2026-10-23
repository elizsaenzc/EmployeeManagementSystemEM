// Recorre la app con cada rol en Chromium: capturas (escritorio y móvil), errores de consola
// y peticiones fallidas. Deja el resultado en ./visual-audit
import { chromium } from 'playwright'
import { mkdirSync, writeFileSync } from 'fs'

const BASE = process.env.BASE_URL ?? 'http://localhost:8080'
const OUT = 'visual-audit'
mkdirSync(OUT, { recursive: true })

const ROLES = {
  admin:    { user: 'ceo',        pass: 'Admin2025!', routes: ['/dashboard', '/employees', '/attendance', '/leaves', '/overtime', '/payroll', '/reports', '/performance', '/notifications', '/email', '/chat'] },
  hr:       { user: 'rrhh.dir',   pass: 'RRHH2025!',  routes: ['/dashboard', '/leaves'] },
  coord:    { user: 'tech.coord', pass: 'Coord2025!', routes: ['/dashboard', '/team', '/leaves', '/performance'] },
  employee: { user: 'carlos.r',   pass: 'Emp2025!',   routes: ['/dashboard', '/attendance', '/schedule', '/leaves', '/documents', '/performance', '/notifications', '/email', '/chat'] },
}
const MOBILE = { employee: ['/dashboard', '/email', '/chat'], admin: ['/employees'] }

const report = []
const browser = await chromium.launch()

async function session(role, viewport, routes, tag) {
  const ctx = await browser.newContext({ viewport, locale: 'es-ES', timezoneId: 'Europe/Madrid' })
  const page = await ctx.newPage()
  page.on('console', m => { if (m.type() === 'error') report.push(`[${role}/${tag}] console: ${m.text()}`) })
  page.on('pageerror', e => report.push(`[${role}/${tag}] pageerror: ${e.message}`))
  page.on('response', r => { if (r.url().includes('/api/') && r.status() >= 400) report.push(`[${role}/${tag}] ${r.status()} ${r.request().method()} ${r.url().replace(BASE, '')}`) })

  await page.goto(BASE + '/login')
  if (tag === 'desktop' && role === 'admin') await page.screenshot({ path: `${OUT}/login-desktop.png` })
  if (tag === 'mobile' && role === 'employee') await page.screenshot({ path: `${OUT}/login-mobile.png` })
  await page.fill('#login-user', ROLES[role].user)
  await page.fill('#login-pass', ROLES[role].pass)
  await page.click('button[type=submit]')
  await page.waitForURL(u => !u.pathname.startsWith('/login'), { timeout: 15000 })

  for (const route of routes) {
    await page.goto(BASE + route)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)
    const name = `${role}-${tag}${route.replace(/\//g, '-')}`
    await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: tag === 'desktop' })
  }

  // Interacciones clave
  if (tag === 'desktop' && role === 'admin') {
    await page.goto(BASE + '/employees'); await page.waitForLoadState('networkidle')
    await page.locator('button[title="Ver ficha"]').first().click(); await page.waitForTimeout(800)
    await page.screenshot({ path: `${OUT}/admin-desktop-employee-modal.png` })
    await page.keyboard.press('Escape')
    await page.goto(BASE + '/email'); await page.waitForLoadState('networkidle')
    const row = page.locator('.email-row').first()
    if (await row.count()) { await row.click(); await page.waitForTimeout(500) }
    await page.screenshot({ path: `${OUT}/admin-desktop-email-open.png` })
  }
  if (tag === 'desktop' && role === 'employee') {
    await page.goto(BASE + '/chat'); await page.waitForLoadState('networkidle')
    await page.locator('.contact-row', { hasText: 'Marcos' }).click(); await page.waitForTimeout(800)
    await page.screenshot({ path: `${OUT}/employee-desktop-chat-open.png` })
    await page.goto(BASE + '/leaves'); await page.waitForLoadState('networkidle')
    await page.getByRole('button', { name: /Nueva solicitud/ }).click(); await page.waitForTimeout(400)
    await page.screenshot({ path: `${OUT}/employee-desktop-leave-modal.png` })
  }
  if (tag === 'mobile' && role === 'employee') {
    await page.goto(BASE + '/dashboard'); await page.waitForLoadState('networkidle')
    await page.getByLabel('Abrir menú').click(); await page.waitForTimeout(400)
    await page.screenshot({ path: `${OUT}/employee-mobile-menu.png` })
  }
  await ctx.close()
}

for (const role of Object.keys(ROLES)) await session(role, { width: 1440, height: 900 }, ROLES[role].routes, 'desktop')
for (const [role, routes] of Object.entries(MOBILE)) await session(role, { width: 390, height: 844 }, routes, 'mobile')
await browser.close()

writeFileSync(`${OUT}/report.txt`, report.length ? report.join('\n') : 'Sin errores de consola ni peticiones fallidas')
console.log(report.join('\n') || 'OK')

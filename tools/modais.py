import asyncio, sys
from playwright.async_api import async_playwright
import os
RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
PAGINA = 'file://' + os.path.join(RAIZ, 'dist-single', 'index.html')
os.makedirs(os.path.join(RAIZ, 'tools', 'shots'), exist_ok=True)
os.chdir(os.path.join(RAIZ, 'tools'))
async def main():
    W,H=[int(x) for x in sys.argv[1].split('x')]; pre=sys.argv[2]
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        pg = await b.new_page(viewport={'width':W,'height':H}, has_touch=True)
        errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(PAGINA); await pg.wait_for_timeout(1800)
        await pg.screenshot(path=f'shots/{pre}_bv.png')
        await pg.locator('.bv .pill.ghost').click(); await pg.wait_for_timeout(500)
        await pg.locator('.showcase-btn .pill').nth(1).click(); await pg.wait_for_timeout(700)
        await pg.screenshot(path=f'shots/{pre}_conq.png')
        await pg.keyboard.press('Escape'); await pg.mouse.click(5,5); await pg.wait_for_timeout(400)
        await pg.evaluate("window.__ballet.setMode('estudio')"); await pg.wait_for_timeout(1000)
        await pg.locator('.studio-acoes .pill.pink').click(); await pg.wait_for_timeout(700)
        await pg.screenshot(path=f'shots/{pre}_coreos.png')
        await pg.mouse.click(5,5); await pg.wait_for_timeout(400)
        await pg.locator('.studio-acoes .pill.lilac').click(); await pg.wait_for_timeout(2500)
        await pg.screenshot(path=f'shots/{pre}_palco1.png')
        await pg.wait_for_timeout(5000)
        await pg.screenshot(path=f'shots/{pre}_palco2.png')
        await pg.evaluate("window.__ballet.openFase('seq')"); await pg.wait_for_timeout(1000)
        await pg.evaluate("window.__ballet.state().loadProgram(window.__ballet.fase('seq').alvo)"); await pg.wait_for_timeout(800)
        await pg.locator('.check-btn').click(); await pg.wait_for_timeout(1500)
        await pg.screenshot(path=f'shots/{pre}_result.png')
        print('errs', errs)
        await b.close()
asyncio.run(main())

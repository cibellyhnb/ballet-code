import asyncio
from playwright.async_api import async_playwright
import os
RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
PAGINA = 'file://' + os.path.join(RAIZ, 'dist-single', 'index.html')
os.makedirs(os.path.join(RAIZ, 'tools', 'shots'), exist_ok=True)
os.chdir(os.path.join(RAIZ, 'tools'))
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        ctx = await b.new_context(viewport={'width':1360,'height':820}, accept_downloads=True)
        pg = await ctx.new_page()
        await pg.add_init_script("localStorage.setItem('balletcode.boasvindas.v1','1')")
        errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(PAGINA); await pg.wait_for_timeout(1200)
        await pg.evaluate("window.__ballet.setMode('estudio')"); await pg.wait_for_timeout(800)
        await pg.evaluate("window.__ballet.setPreset('giros')"); await pg.wait_for_timeout(800)
        await pg.screenshot(path='shots/c_studio.png')
        await pg.click('text=♡ minhas coreografias'); await pg.wait_for_timeout(300)
        await pg.fill('.coreo-salvar input', 'Meus giros'); await pg.click('text=salvar a atual'); await pg.wait_for_timeout(300)
        await pg.evaluate("window.__ballet.setPreset('balances')"); await pg.wait_for_timeout(500)
        await pg.fill('.coreo-salvar input', 'Valsinha'); await pg.click('text=salvar a atual'); await pg.wait_for_timeout(300)
        await pg.screenshot(path='shots/c_lista.png')
        # baixar
        async with pg.expect_download() as d:
            await pg.locator('.coreo-item').nth(1).locator('text=baixar').click()
        dl = await d.value; path = '/tmp/coreo.ballet.txt'; await dl.save_as(path)
        print('arquivo:', dl.suggested_filename); print(open(path).read()[:200])
        # apagar e reimportar
        await pg.locator('.coreo-item').nth(1).locator('text=apagar').click()
        await pg.locator('.coreo-item').nth(1).locator('text=certeza?').click(); await pg.wait_for_timeout(200)
        print('itens após apagar', await pg.locator('.coreo-item').count())
        await pg.set_input_files('.coreos input[type=file]', path); await pg.wait_for_timeout(500)
        print('itens após importar', await pg.locator('.coreo-item').count(), await pg.inner_text('.coreo-lista'))
        # abrir Meus giros
        await pg.locator('.coreo-item', has_text='Meus giros').locator('text=abrir').click(); await pg.wait_for_timeout(800)
        print('total timeline', await pg.evaluate("window.__ballet.state().timeline.total"), 'erros', await pg.evaluate("window.__ballet.state().errors.length"))
        await pg.reload(); await pg.wait_for_timeout(1200)
        await pg.evaluate("window.__ballet.setMode('estudio')"); await pg.wait_for_timeout(600)
        await pg.click('text=♡ minhas coreografias'); await pg.wait_for_timeout(300)
        print('persistiu', await pg.locator('.coreo-item').count())
        print('errs', errs)
        await b.close()
asyncio.run(main())

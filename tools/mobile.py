import asyncio, sys
from playwright.async_api import async_playwright
import os
RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
PAGINA = 'file://' + os.path.join(RAIZ, 'dist-single', 'index.html')
os.makedirs(os.path.join(RAIZ, 'tools', 'shots'), exist_ok=True)
os.chdir(os.path.join(RAIZ, 'tools'))
# uso: mobile.py LARGxALT prefixo
async def main():
    W,H=[int(x) for x in sys.argv[1].split('x')]; pre=sys.argv[2]
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        ctx = await b.new_context(viewport={'width':W,'height':H}, device_scale_factor=1, has_touch=True, is_mobile=W<700)
        pg = await ctx.new_page()
        await pg.add_init_script("localStorage.setItem('balletcode.boasvindas.v1','1')")
        errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(PAGINA); await pg.wait_for_timeout(1500)
        await pg.screenshot(path=f'shots/{pre}_home.png', full_page=True)
        telas=[('aula',"window.__ballet.setMode('aula')"),('fase',"window.__ballet.openFase('seq')"),('estudio',"window.__ballet.setMode('estudio')"),('camarim',"window.__ballet.setMode('camarim')"),('glossario',"window.__ballet.setMode('glossario')"),('ditado',"window.__ballet.openFase('p-balance')")]
        for nome,js in telas:
            try:
                await pg.evaluate(js); await pg.wait_for_timeout(1300)
                await pg.screenshot(path=f'shots/{pre}_{nome}.png', full_page=True)
            except Exception as e: print(nome, e)
        await pg.evaluate("window.__ballet.setMode('inicio')"); await pg.wait_for_timeout(500)
        await pg.evaluate("localStorage.removeItem('balletcode.boasvindas.v1')")
        await pg.reload(); await pg.wait_for_timeout(1500)
        await pg.screenshot(path=f'shots/{pre}_bv.png')
        print('errs', errs)
        await b.close()
asyncio.run(main())

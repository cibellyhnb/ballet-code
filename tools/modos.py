import asyncio, json
from playwright.async_api import async_playwright
import os
RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
PAGINA = 'file://' + os.path.join(RAIZ, 'dist-single', 'index.html')
os.makedirs(os.path.join(RAIZ, 'tools', 'shots'), exist_ok=True)
os.chdir(os.path.join(RAIZ, 'tools'))
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        pg = await b.new_page(viewport={'width':1360,'height':820})
        await pg.add_init_script("localStorage.setItem('balletcode.boasvindas.v1','1')")
        errs=[]
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(PAGINA)
        await pg.wait_for_timeout(1500)
        await pg.screenshot(path='shots/m_home.png')
        async def solve(id, prog_expr):
            await pg.evaluate(f"window.__ballet.openFase('{id}')")
            await pg.wait_for_timeout(1300)
            await pg.screenshot(path=f'shots/m_{id}_start.png')
            await pg.evaluate(f"window.__loadBlocks({prog_expr})")
            await pg.wait_for_timeout(600)
            await pg.click('.check-btn'); await pg.wait_for_timeout(400)
            t=(await pg.inner_text('.modal')).replace('\n',' | ')
            await pg.screenshot(path=f'shots/m_{id}_res.png')
            await pg.click('.modal .pill.ghost'); await pg.wait_for_timeout(200)
            return t
        # desafio: solução certa
        print('d-oito ok:', await solve('d-oito', "window.__ballet.fase('d-oito').alvo"))
        # desafio: proibido
        print('d-pos proibido:', await solve('d-pos', "(()=>{const a=window.__ballet.fase('d-pos').alvo; return {funcoes:[],principal:[{t:'pes',pos:'1'},...a.principal]}})()"))
        # conserta: sem mexer
        await pg.evaluate("window.__ballet.openFase('c-conta')"); await pg.wait_for_timeout(1300)
        await pg.click('.check-btn'); await pg.wait_for_timeout(400)
        print('c-conta sem mexer:', (await pg.inner_text('.modal')).replace('\n',' | '))
        await pg.click('.modal .pill.ghost')
        print('c-conta ok:', await solve('c-conta', "window.__ballet.fase('c-conta').alvo"))
        # ditado
        await pg.evaluate("window.__ballet.openFase('p-plies')"); await pg.wait_for_timeout(1300)
        print('ver exemplo visível antes?', await pg.locator('text=ver exemplo').count())
        for _ in range(3):
            await pg.click('.ditado .pill'); await pg.wait_for_timeout(300)
        await pg.screenshot(path='shots/m_ditado.png')
        await pg.evaluate("window.__loadBlocks({funcoes:[],principal:[{t:'preparacao',perna:'R'},{t:'demiPlie'}]})"); await pg.wait_for_timeout(500)
        await pg.click('.check-btn'); await pg.wait_for_timeout(400)
        print('p-plies errado:', (await pg.inner_text('.modal')).replace('\n',' | '))
        await pg.click('.modal .pill.ghost')
        print('ver exemplo depois?', await pg.locator('text=ver exemplo').count())
        await pg.evaluate("window.__loadBlocks(window.__ballet.fase('p-plies').alvo)"); await pg.wait_for_timeout(500)
        await pg.click('.check-btn'); await pg.wait_for_timeout(400)
        print('p-plies ok:', (await pg.inner_text('.modal')).replace('\n',' | '))
        await pg.click('.modal .pill.ghost')
        await pg.click('.back-link'); await pg.wait_for_timeout(500)
        await pg.screenshot(path='shots/m_map_ditado.png')
        await pg.evaluate("window.__ballet.setMode('desafios')"); await pg.wait_for_timeout(500)
        await pg.screenshot(path='shots/m_map_desafios.png')
        await pg.evaluate("window.__ballet.setMode('inicio')"); await pg.wait_for_timeout(800)
        await pg.screenshot(path='shots/m_home2.png')
        print('pageerrors', errs)
        await b.close()
asyncio.run(main())

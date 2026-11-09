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
        pg = await b.new_page(viewport={'width':1360,'height':820})
        await pg.add_init_script("localStorage.setItem('balletcode.boasvindas.v1','1')")
        errs=[]
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(PAGINA)
        await pg.wait_for_timeout(1200)
        await pg.click('text=Estúdio livre')
        await pg.wait_for_timeout(1200)
        # muda o repetir para 3 vezes e confere o total de tempos
        r = await pg.evaluate("""() => {
          const ws = window.__ws
          const rep = ws.getAllBlocks().find(b => b.type === 'bc_repetir')
          rep.setFieldValue(3, 'N')
          return true }""")
        await pg.wait_for_timeout(600)
        total = await pg.evaluate("() => document.querySelector('.phrase')?.textContent")
        print('apos repetir=3:', total)
        # tira o tendu de dentro do para cada e usa (direção) fora -> erro
        await pg.evaluate("""() => {
          const ws = window.__ws
          const t = ws.getAllBlocks().find(b => b.type === 'bc_tendu')
          t.unplug(); t.moveBy(300, 0)
          const start = ws.getAllBlocks().find(b => b.type === 'bc_start')
          return true }""")
        await pg.wait_for_timeout(600)
        oops = await pg.evaluate("() => document.querySelector('.oops')?.innerText")
        print('erros:', oops)
        await pg.screenshot(path='shots/z_err.png')
        print('pageerrors', errs)
        await b.close()
asyncio.run(main())

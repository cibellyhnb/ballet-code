import asyncio
from playwright.async_api import async_playwright
import os
RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
PAGINA = 'file://' + os.path.join(RAIZ, 'dist-single', 'index.html')
os.makedirs(os.path.join(RAIZ, 'tools', 'shots'), exist_ok=True)
os.chdir(os.path.join(RAIZ, 'tools'))
BUILD = """(spec) => {
  const ws = window.__ws
  ws.clear()
  const mk = (t, fields) => { const b = ws.newBlock(t); for (const [k,v] of Object.entries(fields||{})) b.setFieldValue(v,k); b.initSvg(); b.render(); return b }
  let prev = mk('bc_start')
  for (const [t, f] of spec) { const b = mk(t, f); prev.nextConnection.connect(b.previousConnection); prev = b }
  return true }"""
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        pg = await b.new_page(viewport={'width':1360,'height':820})
        await pg.add_init_script("localStorage.setItem('balletcode.boasvindas.v1','1')")
        errs=[]
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(PAGINA)
        await pg.wait_for_timeout(1200)
        await pg.screenshot(path='shots/a_home.png')
        await pg.click('text=Aula')
        await pg.wait_for_timeout(600)
        await pg.screenshot(path='shots/a_map.png')
        await pg.click('.stop >> nth=0')
        await pg.wait_for_timeout(1500)
        await pg.evaluate(BUILD, [['bc_prep',{}],['bc_plie',{}],['bc_plie',{}],['bc_final',{}]])
        await pg.wait_for_timeout(600)
        await pg.click('.check-btn')
        await pg.wait_for_timeout(500)
        print('fase1:', (await pg.inner_text('.modal')).replace('\n',' | '))
        await pg.screenshot(path='shots/a_ok.png')
        await pg.click('text=próxima fase')
        await pg.wait_for_timeout(1500)
        await pg.evaluate(BUILD, [['bc_prep',{}],['bc_plie',{}],['bc_plie',{}],['bc_plie',{}],['bc_final',{}]])
        await pg.wait_for_timeout(600)
        await pg.click('.check-btn')
        await pg.wait_for_timeout(500)
        print('fase2 errada:', (await pg.inner_text('.modal')).replace('\n',' | '))
        await pg.click('text=continuar tentando')
        await pg.click('text=ver exemplo')
        await pg.wait_for_timeout(2500)
        await pg.screenshot(path='shots/a_exemplo.png')
        # tendu com perna da barra -> erro do validador
        await pg.click('text=‹ fases')
        await pg.wait_for_timeout(500)
        await pg.screenshot(path='shots/a_map2.png')
        print('pageerrors', errs)
        await b.close()
asyncio.run(main())

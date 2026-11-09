import asyncio, sys
from playwright.async_api import async_playwright
import os
RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
PAGINA = 'file://' + os.path.join(RAIZ, 'dist-single', 'index.html')
os.makedirs(os.path.join(RAIZ, 'tools', 'shots'), exist_ok=True)
os.chdir(os.path.join(RAIZ, 'tools'))
async def main():
    W,H=[int(x) for x in sys.argv[1].split('x')]; js=sys.argv[2]; q=sys.argv[3]
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        pg = await b.new_page(viewport={'width':W,'height':H})
        await pg.add_init_script("localStorage.setItem('balletcode.boasvindas.v1','1')")
        await pg.goto(PAGINA); await pg.wait_for_timeout(1200)
        await pg.evaluate(js); await pg.wait_for_timeout(1200)
        r = await pg.evaluate("""(q)=>[...document.querySelectorAll(q)].map(e=>{const r=e.getBoundingClientRect();return e.className.toString().slice(0,40)+' '+Math.round(r.x)+','+Math.round(r.y)+' '+Math.round(r.width)+'x'+Math.round(r.height)+' sw'+e.scrollWidth})""", q)
        print('\n'.join(r))
        print('doc', await pg.evaluate("document.documentElement.scrollWidth"))
        await b.close()
asyncio.run(main())

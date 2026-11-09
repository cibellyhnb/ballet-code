import asyncio, sys, os
from playwright.async_api import async_playwright
import os
RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
PAGINA = 'file://' + os.path.join(RAIZ, 'dist-single', 'index.html')
os.makedirs(os.path.join(RAIZ, 'tools', 'shots'), exist_ok=True)
os.chdir(os.path.join(RAIZ, 'tools'))
# uso: viagem.py preset beat1,beat2,... [cam]
async def main():
    preset=sys.argv[1]; beats=[float(b) for b in sys.argv[2].split(',')]; cam=sys.argv[3] if len(sys.argv)>3 else 'frente'
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        pg = await b.new_page(viewport={'width':1360,'height':820})
        await pg.add_init_script("localStorage.setItem('balletcode.boasvindas.v1','1')")
        errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(PAGINA); await pg.wait_for_timeout(1200)
        await pg.evaluate(f"window.__ballet.setPreset('{preset}')"); await pg.wait_for_timeout(800)
        await pg.evaluate(f"window.__ballet.setCam('{cam}')")
        for bt in beats:
            await pg.evaluate(f"window.__ballet.setBeat({bt})"); await pg.wait_for_timeout(1400)
            lab = await pg.evaluate(f"(()=>{{const s=window.__ballet.state(); let i=0; const t=s.timeline; while(i<t.moves.length-1&&t.starts[i+1]<=s.beat)i++; return t.moves[i].label}})()")
            box = await pg.locator('canvas').first.bounding_box()
            await pg.screenshot(path=f'shots/v_{preset}_{bt}.png', clip={'x':box['x'],'y':box['y'],'width':box['width'],'height':box['height']})
            print(bt, lab)
        print('errs', errs)
        await b.close()
asyncio.run(main())

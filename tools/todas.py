import asyncio, json
from playwright.async_api import async_playwright
import os
RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
PAGINA = 'file://' + os.path.join(RAIZ, 'dist-single', 'index.html')
os.makedirs(os.path.join(RAIZ, 'tools', 'shots'), exist_ok=True)
os.chdir(os.path.join(RAIZ, 'tools'))
# resolve TODAS as fases de todas as trilhas com o alvo (deve dar estrela) e testa mensagens de erro
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        pg = await b.new_page(viewport={'width':1360,'height':820})
        await pg.add_init_script("localStorage.setItem('balletcode.boasvindas.v1','1')")
        errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(PAGINA); await pg.wait_for_timeout(1200)
        ids = await pg.evaluate("['seq','rep','pliesPos','tendu','croix','glisse','quinta','rond','frappe','releve','grand','lados','cloche','cheval','piruetas','penche','cDirecoes','cFouette','cAllegro','d-oito','d-croix2','d-pos','d-lados','d-allegro','c-perna','c-conta','c-finalizar','c-direcao','c-quinta','c-virar','p-plies','p-tendus','p-quinta','p-adage','p-centro','g-glissade','g-bourree','g-balance','g-petit','g-jete','g-lados','g-giros','g-fouettes','d-balance','d-piques','d-petit','c-glissade','c-fouette','c-jete','p-balance','p-giros','p-allegro']")
        ruins=[]
        async def conferir():
            await pg.click('.check-btn'); await pg.wait_for_timeout(300)
            t=(await pg.inner_text('.modal')).replace('\n',' | ')
            n=await pg.locator('.modal .stars .on').count()
            await pg.click('.modal .pill.ghost'); await pg.wait_for_timeout(150)
            return n,t
        for fid in ids:
            await pg.evaluate(f"window.__ballet.openFase('{fid}')"); await pg.wait_for_timeout(900)
            await pg.evaluate(f"window.__loadBlocks(window.__ballet.fase('{fid}').alvo)"); await pg.wait_for_timeout(450)
            n,t = await conferir()
            if n < 3: ruins.append((fid,n,t[:160]))
        print('fases sem 3 estrelas:', ruins)
        # o caso da captura: pausa errada
        await pg.evaluate("window.__ballet.openFase('cDirecoes')"); await pg.wait_for_timeout(900)
        await pg.evaluate("window.__loadBlocks({funcoes:[],principal:[{t:'local',onde:'centro'},{t:'pes',pos:'5'},{t:'direcao',dir:'croise'},{t:'direcao',dir:'efface'},{t:'direcao',dir:'enface'},{t:'pausa',tempos:2}]})"); await pg.wait_for_timeout(450)
        print('pausa errada:', (await conferir())[1][:200])
        # perna trocada no centro
        await pg.evaluate("window.__ballet.openFase('g-glissade')"); await pg.wait_for_timeout(900)
        await pg.evaluate("window.__loadBlocks({funcoes:[],principal:[{t:'local',onde:'centro'},{t:'pes',pos:'5'},{t:'bracosAmbos',pos:'segunda'},{t:'repetir',vezes:2,corpo:[{t:'glissade',perna:'L'},{t:'glissade',perna:'R'}]}]})"); await pg.wait_for_timeout(450)
        print('perna trocada:', (await conferir())[1][:200])
        await pg.evaluate("window.__ballet.openFase('g-glissade')"); await pg.wait_for_timeout(900)
        await pg.evaluate("window.__loadBlocks({funcoes:[],principal:[{t:'local',onde:'centro'},{t:'pes',pos:'5'},{t:'bracosAmbos',pos:'quinta'},{t:'repetir',vezes:2,corpo:[{t:'glissade',perna:'R'},{t:'glissade',perna:'L'}]}]})"); await pg.wait_for_timeout(450)
        print('braço trocado:', (await conferir())[1][:200])
        await pg.screenshot(path='shots/f_panel.png')
        print('errs', errs)
        await b.close()
asyncio.run(main())

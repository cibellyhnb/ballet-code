import asyncio, sys
from playwright.async_api import async_playwright
import os
RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
PAGINA = 'file://' + os.path.join(RAIZ, 'dist-single', 'index.html')
os.makedirs(os.path.join(RAIZ, 'tools', 'shots'), exist_ok=True)
os.chdir(os.path.join(RAIZ, 'tools'))
# mede se o botão "conferir" e a caixa de aviso ficam visíveis (dentro do painel e da janela) em várias telas
CASOS = [(1366,768),(1280,720),(1440,900),(1536,864),(1920,1080),(1280,800),(1366,660),(1280,620)]
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        ruins = 0
        for (w,h) in CASOS:
            pg = await b.new_page(viewport={'width':w,'height':h})
            await pg.add_init_script("localStorage.setItem('balletcode.boasvindas.v1','1')")
            await pg.goto(PAGINA); await pg.wait_for_timeout(900)
            for fid, prog in [('g-bourree', "{funcoes:[{nome:'viajar',params:['perna'],corpo:[{t:'repetir',vezes:2,corpo:[{t:'glissade',perna:{var:'perna'}}]},{t:'pasDeBourree',perna:{var:'perna'}}]}],principal:[{t:'local',onde:'centro'},{t:'pes',pos:'5'},{t:'chamar',fn:'viajar',args:{perna:'R'}},{t:'chamar',fn:'viajar',args:{perna:'L'}},{t:'pausa',tempos:2}]}"),
                              ('p-adage', "{funcoes:[],principal:[{t:'preparacao',perna:'R'},{t:'pausa',tempos:3}]}"),
                              ('lados', "{funcoes:[],principal:[{t:'tendu',perna:'L',dir:'devant'}]}")]:
                await pg.evaluate(f"window.__ballet.openFase('{fid}')"); await pg.wait_for_timeout(700)
                if fid=='p-adage':
                    for _ in range(6):
                        await pg.click('.ditado .pill'); await pg.wait_for_timeout(80)
                await pg.evaluate(f"window.__loadBlocks({prog})"); await pg.wait_for_timeout(500)
                r = await pg.evaluate("""(()=>{
                  const vis = (sel) => { const e=document.querySelector(sel); if(!e) return 'ausente';
                    const b=e.getBoundingClientRect(); const pan=document.querySelector('.panel.studio').getBoundingClientRect();
                    const dentro = b.top>=pan.top-1 && b.bottom<=pan.bottom+1 && b.bottom<=innerHeight+1;
                    // algo por cima?
                    const x=b.left+b.width/2, y=Math.min(b.bottom-4, innerHeight-2); const topo=document.elementFromPoint(x,y);
                    return (dentro && topo && e.contains(topo)) ? 'ok' : `CORTADO (${Math.round(b.top)}-${Math.round(b.bottom)} painel ${Math.round(pan.top)}-${Math.round(pan.bottom)})` };
                  const ed=document.querySelector('.editor-area').getBoundingClientRect();
                  return {botao: vis('.check-btn'), aviso: vis('.oops') , dica: vis('.hint-box'), editor: Math.round(ed.height)} })()""")
                bad = any(isinstance(v,str) and v.startswith('CORTADO') for v in r.values()) or r['editor'] < 115
                ruins += bad
                print(f"{w}x{h} {fid:10}", r, '<<<' if bad else '')
                if bad and w==1366: await pg.screenshot(path=f'shots/l_{w}_{fid}.png')
            await pg.close()
        print('problemas', ruins)
        await b.close()
asyncio.run(main())
